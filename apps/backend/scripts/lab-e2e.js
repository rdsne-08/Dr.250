import assert from 'node:assert/strict';
import { File } from 'node:buffer';
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

const [
  { createApp },
  { closeDatabase, query },
  { supabaseAdmin },
  { removeReportFile },
] = await Promise.all([
  import('../src/app.js'),
  import('../src/database/pool.js'),
  import('../src/config/supabase.js'),
  import('../src/modules/labs/services/report-file.service.js'),
]);

async function cleanupUsers(userIds) {
  if (!userIds.length) return;

  const reports = await query(
    `
      SELECT report.id
      FROM public.lab_reports AS report
      WHERE report.patient_id IN (
        SELECT patient.id FROM public.patients AS patient
        INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      ) OR report.laboratory_id IN (
        SELECT laboratory.id FROM public.laboratories AS laboratory
        INNER JOIN public.profiles AS profile ON profile.id = laboratory.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      ) OR report.requested_by_doctor_id IN (
        SELECT doctor.id FROM public.doctors AS doctor
        INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      )
    `,
    [userIds],
  );
  await Promise.all(reports.rows.map(({ id }) => removeReportFile(id)));
  await query(
    `DELETE FROM public.medical_records WHERE patient_id IN (
       SELECT patient.id FROM public.patients AS patient
       INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
       WHERE profile.user_id = ANY($1::uuid[])
     )`,
    [userIds],
  );
  await query(
    `DELETE FROM public.lab_reports WHERE id = ANY($1::uuid[])`,
    [reports.rows.map(({ id }) => id)],
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
  `SELECT id FROM public.users WHERE email LIKE 'dr250.lab-e2e.%@example.com'`,
);
await cleanupUsers(staleUsers.rows.map(({ id }) => id));

const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const nativeFetch = globalThis.fetch;
const runId = Date.now();
const password = `Dr250-Lab-E2E-${runId}!`;
const patientEmail = `dr250.lab-e2e.patient.${runId}@example.com`;
const doctorEmail = `dr250.lab-e2e.doctor.${runId}@example.com`;
const labEmail = `dr250.lab-e2e.lab.${runId}@example.com`;
const createdUserIds = [];

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
  { labService },
  { patientService },
] = await Promise.all([
  import('../../frontend/src/services/authService.js'),
  import('../../frontend/src/services/apiClient.js'),
  import('../../frontend/src/services/doctorService.js'),
  import('../../frontend/src/services/labService.js'),
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
  await register({ name: 'Lab E2E Patient', email: patientEmail, role: 'PATIENT' });
  clearApiSession();
  await register({
    name: 'Dr. Lab E2E',
    email: doctorEmail,
    role: 'DOCTOR',
    specialization: 'Internal Medicine',
    licenseNumber: `BMDC-LAB-E2E-${runId}`,
  });
  clearApiSession();
  const labRegistration = await register({
    name: 'Lab E2E Operator',
    email: labEmail,
    role: 'LAB',
    labName: 'Dr.250 E2E Diagnostics',
    licenseNumber: `DGHS-LAB-E2E-${runId}`,
  });
  assert.equal(labRegistration.user.role, 'LAB');

  const accountResult = await query(
    `
      SELECT app_user.id AS user_id, app_user.email, profile.role,
             patient.id AS patient_id, doctor.id AS doctor_id,
             laboratory.id AS laboratory_id, laboratory.lab_name,
             laboratory.license_number, laboratory.verification_status AS lab_status
      FROM public.users AS app_user
      INNER JOIN public.profiles AS profile ON profile.user_id = app_user.id
      LEFT JOIN public.patients AS patient ON patient.profile_id = profile.id
      LEFT JOIN public.doctors AS doctor ON doctor.profile_id = profile.id
      LEFT JOIN public.laboratories AS laboratory ON laboratory.profile_id = profile.id
      WHERE lower(app_user.email) = ANY($1::text[])
    `,
    [[patientEmail, doctorEmail, labEmail]],
  );
  const patient = accountResult.rows.find((account) => account.role === 'PATIENT');
  const doctor = accountResult.rows.find((account) => account.role === 'DOCTOR');
  const laboratory = accountResult.rows.find((account) => account.role === 'LAB');
  assert.ok(patient?.patient_id);
  assert.ok(doctor?.doctor_id);
  assert.ok(laboratory?.laboratory_id);
  assert.equal(laboratory.lab_name, 'Dr.250 E2E Diagnostics');
  assert.equal(laboratory.license_number, `DGHS-LAB-E2E-${runId}`);
  assert.equal(laboratory.lab_status, 'PENDING');

  await query(`UPDATE public.doctors SET verification_status = 'VERIFIED' WHERE id = $1`, [doctor.doctor_id]);
  await query(`UPDATE public.laboratories SET verification_status = 'VERIFIED' WHERE id = $1`, [laboratory.laboratory_id]);

  clearApiSession();
  await authService.login({ email: patientEmail, password, role: 'PATIENT', remember: true });
  await apiClient.post('/api/sessions', {
    doctor_id: doctor.doctor_id,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  clearApiSession();
  await authService.login({ email: doctorEmail, password, role: 'DOCTOR', remember: true });
  const doctorDashboard = await doctorService.getDashboard();
  assert.ok(doctorDashboard.laboratories.some((candidate) => candidate.id === laboratory.laboratory_id));
  const requestedReport = await doctorService.createLabRequest({
    patientId: patient.patient_id,
    laboratoryId: laboratory.laboratory_id,
    testName: 'Complete Blood Count',
  });
  assert.equal(requestedReport.status, 'REQUESTED');

  clearApiSession();
  const labLogin = await authService.login({ email: labEmail, password, role: 'LAB', remember: true });
  assert.equal(labLogin.user.role, 'LAB');
  let labDashboard = await labService.getDashboard();
  assert.ok(labDashboard.doctorRequests.some((request) => request.id === requestedReport.id));
  await labService.updateReportStatus(requestedReport.id, 'SAMPLE_COLLECTED');
  await labService.updateReportStatus(requestedReport.id, 'PROCESSING');
  const completedReport = await labService.uploadReport({
    reportId: requestedReport.id,
    testType: 'Complete Blood Count',
    note: 'All measured values are within the reference range.',
    file: new File(['%PDF-1.4 Dr.250 laboratory E2E report'], 'cbc-report.pdf', {
      type: 'application/pdf',
    }),
  });
  assert.equal(completedReport.status, 'COMPLETED');
  labDashboard = await labService.getDashboard();
  assert.ok(labDashboard.reports.some((report) => report.id === requestedReport.id));

  clearApiSession();
  await authService.login({ email: patientEmail, password, role: 'PATIENT', remember: true });
  const patientDashboard = await patientService.getDashboard();
  const visibleReport = patientDashboard.timeline.find(
    (event) => event.type === 'report' && event.reportId === requestedReport.id,
  );
  assert.ok(visibleReport);
  assert.match(visibleReport.title, /Complete Blood Count/);

  const downloadResponse = await nativeFetch(`${baseUrl}/api/reports/${requestedReport.id}/file`, {
    headers: { Authorization: `Bearer ${readApiSession().accessToken}` },
  });
  assert.equal(downloadResponse.status, 200);
  assert.match(await downloadResponse.text(), /Dr\.250 laboratory E2E report/);

  console.log(JSON.stringify({
    status: 'passed',
    labRegistrationRows: ['users', 'profiles', 'laboratories'],
    doctorLabRequest: true,
    labLogin: true,
    assignedRequestReceived: true,
    statusUpdated: true,
    reportUploaded: true,
    patientReportVisible: true,
    patientFileAccess: true,
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
