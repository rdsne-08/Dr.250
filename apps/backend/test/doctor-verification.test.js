import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
const { verifyDemoDoctor } = await import('../scripts/verify-demo-doctor.js');
const { authorizePatientDataAccess } = await import('../src/modules/sessions/services/access.service.js');
const { createDoctorPrescription } = await import('../src/modules/prescriptions/services/prescription.service.js');
const { getMedicalRecords } = await import('../src/modules/medical-records/services/medical-record.service.js');
const { revokePatientSession } = await import('../src/modules/sessions/services/session.service.js');

test('setup verification requires an existing admin, matching license, and pending doctor; writes an audit event', async () => {
  const statements = [];
  const database = {
    connect: async () => ({
      release() {},
      async query(sql, values) {
        statements.push({ sql, values });
        if (sql.includes('UPDATE public.doctors')) return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED' }] };
        if (sql.includes('SELECT app_user.id')) return { rows: [{ id: 'operator-1' }] };
        return { rows: [] };
      },
    }),
  };
  const result = await verifyDemoDoctor({ doctorEmail: 'doctor@example.com',
    licenseNumber: '123456', operatorEmail: 'operator@example.com' }, database);
  assert.equal(result.verification_status, 'VERIFIED');
  const update = statements.find(({ sql }) => sql.includes('UPDATE public.doctors'));
  assert.deepEqual(update.values, ['doctor@example.com', '123456', 'operator-1']);
  assert.match(update.sql, /doctor\.verification_status = 'PENDING'/);
  const audit = statements.find(({ sql }) => sql.includes('INSERT INTO public.audit_logs'));
  assert.deepEqual(audit.values.slice(0, 2), ['operator-1', 'doctor-1']);
  assert.equal(statements.at(-1).sql, 'COMMIT');
});

test('setup command refuses missing admin identity and unmatched doctor license', async () => {
  for (const failure of ['admin', 'license']) {
    const statements = [];
    const database = {
      connect: async () => ({
        release() {},
        async query(sql) {
          statements.push(sql);
          if (sql.includes('SELECT app_user.id')) {
            return { rows: failure === 'admin' ? [] : [{ id: 'operator-1' }] };
          }
          return { rows: [] };
        },
      }),
    };
    await assert.rejects(verifyDemoDoctor({ doctorEmail: 'doctor@example.com',
      licenseNumber: 'wrong', operatorEmail: 'operator@example.com' }, database));
    assert.equal(statements.includes('COMMIT'), false);
    assert.equal(statements.at(-1), 'ROLLBACK');
    assert.equal(statements.some(sql => sql.includes('INSERT INTO public.audit_logs')), false);
  }
});

test('pending doctor cannot read records or create a prescription despite a patient grant', async () => {
  const database = { query: async () => ({ rows: [{ id: 'doctor-1',
    verification_status: 'PENDING', authorized: true }] }) };
  const user = { id: 'doctor-user', role: 'DOCTOR' };
  await assert.rejects(authorizePatientDataAccess(user, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'DOCTOR_NOT_VERIFIED');
  await assert.rejects(getMedicalRecords(user, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'DOCTOR_NOT_VERIFIED');
  await assert.rejects(createDoctorPrescription(user, { patientId: 'patient-1' }, database),
    error => error.statusCode === 403 && error.code === 'DOCTOR_NOT_VERIFIED');
});

test('verified doctor with a patient grant can read and save to that patient profile', async () => {
  const statements = [];
  const database = { query: async (sql, values) => {
    statements.push({ sql, values });
    if (sql.includes('AS authorized')) return { rows: [{ id: 'doctor-1',
      verification_status: 'VERIFIED', authorized: true }] };
    if (sql.includes('FROM public.medical_records')) return { rows: [{ id: 'record-1', patient_id: 'patient-1', title: 'Diagnosis' }] };
    if (sql.includes('INSERT INTO public.audit_logs')) return { rows: [{ id: 'audit-1' }] };
    if (sql.includes('INSERT INTO public.prescriptions')) {
      assert.match(sql, /FOR SHARE OF session, verified_doctor/);
      assert.match(sql, /profile\.user_id = \$7/);
      assert.match(sql, /session\.revoked_at IS NULL/);
      return { rows: [{ id: 'rx-1', patient_id: values[0], doctor_id: values[1] }] };
    }
    return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED' }] };
  } };
  const user = { id: 'doctor-user', role: 'DOCTOR' };
  assert.equal((await authorizePatientDataAccess(user, 'patient-1', database)).doctorId, 'doctor-1');
  const records = await getMedicalRecords(user, 'patient-1', database);
  assert.equal(records[0].diagnosis, 'Diagnosis');
  const saved = await createDoctorPrescription(user, { patientId: 'patient-1', medicine: 'Example',
    dosage: 'Once daily', instructions: 'After food' }, database);
  assert.equal(saved.patient_id, 'patient-1');
  assert.deepEqual(statements.at(-1).values.slice(0, 2), ['patient-1', 'doctor-1']);
});

test('patient revocation blocks later record reads and prescriptions', async () => {
  let revoked = false;
  const database = { query: async sql => {
    if (sql.includes('UPDATE public.access_sessions')) {
      revoked = true;
      return { rows: [{ id: 'connection-1', revoked_at: new Date() }] };
    }
    if (sql.includes('SELECT EXISTS')) return { rows: [{ authorized: !revoked }] };
    if (sql.includes('AS authorized')) return { rows: [{ id: 'doctor-1',
      verification_status: 'VERIFIED', authorized: !revoked }] };
    if (sql.includes('INSERT INTO public.prescriptions')) return { rows: revoked ? [] : [{ id: 'rx-1' }] };
    return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED' }] };
  } };
  await revokePatientSession('connection-1', 'patient-1', database);
  const user = { id: 'doctor-user', role: 'DOCTOR' };
  await assert.rejects(getMedicalRecords(user, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
  await assert.rejects(createDoctorPrescription(user, { patientId: 'patient-1' }, database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
});
