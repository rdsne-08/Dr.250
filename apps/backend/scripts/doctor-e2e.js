import assert from 'node:assert/strict';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../../../');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const [{ createApp }, { closeDatabase, query }, { supabaseAdmin }] = await Promise.all([
  import('../src/app.js'),
  import('../src/database/pool.js'),
  import('../src/config/supabase.js'),
]);

const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const nativeFetch = globalThis.fetch;
const runId = Date.now();
const password = `Dr250-E2E-${runId}!`;
const patientEmail = `dr250.doctor-e2e.patient.${runId}@example.com`;
const doctorEmail = `dr250.doctor-e2e.doctor.${runId}@example.com`;
const createdUserIds = [];

async function cleanupUsers(userIds) {
  if (!userIds.length) return;

  await query(
    `
      DELETE FROM public.prescriptions
      WHERE patient_id IN (
        SELECT patient.id FROM public.patients AS patient
        INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      ) OR doctor_id IN (
        SELECT doctor.id FROM public.doctors AS doctor
        INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      )
    `,
    [userIds],
  );
  await query(
    `
      DELETE FROM public.access_sessions
      WHERE patient_id IN (
        SELECT patient.id FROM public.patients AS patient
        INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      ) OR doctor_id IN (
        SELECT doctor.id FROM public.doctors AS doctor
        INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      )
    `,
    [userIds],
  );

  for (const userId of [...userIds].reverse()) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error && error.status !== 404) {
      console.error(`Supabase cleanup failed for ${userId}: ${error.message}`);
    }
    await query(`DELETE FROM public.users WHERE id = $1`, [userId]);
  }
}

const staleUsers = await query(
  `SELECT id FROM public.users WHERE email LIKE 'dr250.doctor-e2e.%@example.com'`,
);
await cleanupUsers(staleUsers.rows.map(({ id }) => id));

globalThis.window = {
  dispatchEvent() {},
  localStorage: createStorage(),
  sessionStorage: createStorage(),
};
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === 'localhost' && url.port === '3000') {
    return nativeFetch(`${baseUrl}${url.pathname}${url.search}`, init);
  }
  return nativeFetch(input, init);
};

const [
  { authService },
  { apiClient, clearApiSession, readApiSession },
  { doctorService },
  { patientService },
] = await Promise.all([
  import('../../frontend/src/services/authService.js'),
  import('../../frontend/src/services/apiClient.js'),
  import('../../frontend/src/services/doctorService.js'),
  import('../../frontend/src/services/patientService.js'),
]);

async function register(details) {
  const session = await authService.register({
    ...details,
    password,
    confirmPassword: password,
    remember: true,
  });
  createdUserIds.push(session.user.id);
  return session;
}

try {
  const patientRegistration = await register({
    name: 'Doctor E2E Patient',
    email: patientEmail,
    role: 'PATIENT',
  });
  assert.equal(patientRegistration.user.role, 'PATIENT');

  clearApiSession();
  const doctorRegistration = await register({
    name: 'Dr. Doctor E2E',
    email: doctorEmail,
    role: 'DOCTOR',
    specialization: 'Internal Medicine',
    licenseNumber: `BMDC-E2E-${runId}`,
  });
  assert.equal(doctorRegistration.user.role, 'DOCTOR');

  const accountResult = await query(
    `
      SELECT app_user.id AS user_id, profile.role, patient.id AS patient_id,
             doctor.id AS doctor_id, doctor.specialization, doctor.license_number,
             doctor.verification_status
      FROM public.users AS app_user
      INNER JOIN public.profiles AS profile ON profile.user_id = app_user.id
      LEFT JOIN public.patients AS patient ON patient.profile_id = profile.id
      LEFT JOIN public.doctors AS doctor ON doctor.profile_id = profile.id
      WHERE lower(app_user.email) = ANY($1::text[])
    `,
    [[patientEmail.toLowerCase(), doctorEmail.toLowerCase()]],
  );
  const patientAccount = accountResult.rows.find((account) => account.role === 'PATIENT');
  const doctorAccount = accountResult.rows.find((account) => account.role === 'DOCTOR');
  assert.ok(patientAccount?.patient_id);
  assert.ok(doctorAccount?.doctor_id);
  assert.equal(doctorAccount.specialization, 'Internal Medicine');
  assert.equal(doctorAccount.license_number, `BMDC-E2E-${runId}`);
  assert.equal(doctorAccount.verification_status, 'PENDING');

  await query(
    `UPDATE public.doctors SET verification_status = 'VERIFIED' WHERE id = $1`,
    [doctorAccount.doctor_id],
  );

  clearApiSession();
  const patientLogin = await authService.login({
    email: patientEmail,
    password,
    role: 'PATIENT',
    remember: true,
  });
  assert.equal(patientLogin.user.role, 'PATIENT');
  await apiClient.post('/api/sessions', {
    doctor_id: doctorAccount.doctor_id,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  clearApiSession();
  const doctorLogin = await authService.login({
    email: doctorEmail,
    password,
    role: 'DOCTOR',
    remember: true,
  });
  assert.equal(doctorLogin.user.role, 'DOCTOR');
  assert.ok(readApiSession()?.accessToken);

  const doctorDashboard = await doctorService.getDashboard();
  assert.equal(doctorDashboard.doctor.id, doctorAccount.doctor_id);
  assert.ok(doctorDashboard.patients.some((patient) => patient.id === patientAccount.patient_id));

  const prescription = await doctorService.createPrescription({
    patientId: patientAccount.patient_id,
    medicine: 'Amlodipine 5 mg',
    dosage: 'Once daily',
    duration: '30 days',
    instructions: 'Take after breakfast.',
  });
  assert.equal(prescription.patient_id, patientAccount.patient_id);

  clearApiSession();
  await authService.login({
    email: patientEmail,
    password,
    role: 'PATIENT',
    remember: true,
  });
  const patientDashboard = await patientService.getDashboard();
  const savedPrescription = patientDashboard.timeline.find(
    (event) => event.type === 'prescription' && event.title.includes('Amlodipine 5 mg'),
  );
  assert.equal(patientDashboard.patient.activeMedicines, 1);
  assert.ok(savedPrescription);
  assert.match(savedPrescription.detail, /Once daily/);

  console.log(JSON.stringify({
    status: 'passed',
    doctorRegistration: true,
    doctorLogin: true,
    patientAuthorization: true,
    patientHistory: true,
    prescriptionCreated: true,
    prescriptionVisibleToPatient: true,
  }));
} finally {
  clearApiSession();
  globalThis.fetch = nativeFetch;
  delete globalThis.window;

  await cleanupUsers(createdUserIds);

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeDatabase();
}
