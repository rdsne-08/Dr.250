import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(testDirectory, '../../../.env'), quiet: true });

const integrationUrl = process.env.DATABASE_INTEGRATION_URL;

if (integrationUrl) {
  process.env.DATABASE_URL = integrationUrl;
  process.env.SUPABASE_URL ||= 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY ||= 'database-integration-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'database-integration-service-role-key';
}

const patientUserId = '90000000-0000-4000-8000-000000000001';
const doctorUserId = '90000000-0000-4000-8000-000000000002';
const labUserId = '90000000-0000-4000-8000-000000000003';
const integrationUserIds = [patientUserId, doctorUserId, labUserId];

async function cleanupIntegrationData(query) {
  await query(
    `
      DELETE FROM public.audit_logs
      WHERE entity_id IN (
        SELECT doctor.id FROM public.doctors AS doctor
        INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
        UNION
        SELECT laboratory.id FROM public.laboratories AS laboratory
        INNER JOIN public.profiles AS profile ON profile.id = laboratory.profile_id
        WHERE profile.user_id = ANY($1::uuid[])
      )
    `,
    [integrationUserIds],
  );
  await query(
    `DELETE FROM public.lab_reports WHERE patient_id IN (
       SELECT patient.id FROM public.patients AS patient
       INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
       WHERE profile.user_id = ANY($1::uuid[])
     )`,
    [integrationUserIds],
  );
  await query(
    `DELETE FROM public.prescriptions WHERE patient_id IN (
       SELECT patient.id FROM public.patients AS patient
       INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
       WHERE profile.user_id = ANY($1::uuid[])
     )`,
    [integrationUserIds],
  );
  await query(
    `DELETE FROM public.medical_records WHERE patient_id IN (
       SELECT patient.id FROM public.patients AS patient
       INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
       WHERE profile.user_id = ANY($1::uuid[])
     )`,
    [integrationUserIds],
  );
  await query(`DELETE FROM public.users WHERE id = ANY($1::uuid[])`, [integrationUserIds]);
}

test('backend services complete the PostgreSQL healthcare data flow', {
  skip: !integrationUrl && 'Set DATABASE_INTEGRATION_URL to run the real PostgreSQL flow.',
}, async () => {
  const { createApp } = await import('../src/app.js');
  const { closeDatabase, query, testDatabaseConnection } = await import('../src/database/pool.js');
  const { getUsers, verifyEntity } = await import('../src/modules/admin/services/admin.service.js');
  const { createProfile } = await import('../src/modules/auth/services/profile.service.js');
  const {
    getAuthorizedPatients,
    getVerifiedDoctor,
  } = await import('../src/modules/doctors/services/doctor.service.js');
  const {
    getAssignedReports,
    getVerifiedLab,
    uploadAssignedReport,
  } = await import('../src/modules/labs/services/lab.service.js');
  const {
    createMedicalRecord,
    getMedicalRecords,
  } = await import('../src/modules/medical-records/services/medical-record.service.js');
  const { assertPatientOwnership } = await import('../src/modules/patients/services/patient.service.js');
  const { createDoctorPrescription } = await import(
    '../src/modules/prescriptions/services/prescription.service.js'
  );
  const {
    createReportRequest,
    getPatientReports,
  } = await import('../src/modules/reports/services/report.service.js');
  const { authorizePatientDataAccess } = await import(
    '../src/modules/sessions/services/access.service.js'
  );
  const { createPatientSession } = await import(
    '../src/modules/sessions/services/session.service.js'
  );

  let server;

  try {
    await cleanupIntegrationData(query);
    assert.equal(await testDatabaseConnection(), true);

    server = await new Promise((resolve) => {
      const listeningServer = createApp().listen(
        0,
        '127.0.0.1',
        () => resolve(listeningServer),
      );
    });
    const healthResponse = await fetch(
      `http://127.0.0.1:${server.address().port}/api/health/database`,
    );
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), {
      success: true,
      database: 'connected',
    });

    const patientProfile = await createProfile({
      userId: patientUserId,
      email: 'flow.patient@example.com',
      fullName: 'Flow Patient',
      role: 'PATIENT',
    });
    const patientResult = await query(
      `UPDATE public.patients SET blood_group = 'A+' WHERE id = $1 RETURNING id`,
      [patientProfile.patient_id],
    );
    const patientId = patientResult.rows[0].id;

    const patientUser = { id: patientUserId, role: 'PATIENT' };
    const record = await createMedicalRecord(patientUser, {
      patientId,
      diagnosis: 'Integration test diagnosis',
      notes: 'Created through the backend medical record service.',
    });
    const records = await getMedicalRecords(patientUser, patientId);
    assert.ok(records.some((candidate) => candidate.id === record.id));

    await assert.rejects(
      assertPatientOwnership(
        patientUserId,
        '20000000-0000-4000-8000-000000000001',
      ),
      (error) => error.statusCode === 403,
    );

    const doctorProfile = await createProfile({
      userId: doctorUserId,
      email: 'flow.doctor@example.com',
      fullName: 'Dr. Flow Doctor',
      role: 'DOCTOR',
      specialization: 'General Medicine',
      licenseNumber: 'BMDC-FLOW-001',
    });
    await query(
      `UPDATE public.doctors SET verification_status = 'VERIFIED' WHERE id = $1`,
      [doctorProfile.doctor_id],
    );
    const doctorUser = { id: doctorUserId, role: 'DOCTOR' };
    const doctor = await getVerifiedDoctor(doctorUserId);

    await assert.rejects(
      authorizePatientDataAccess(doctorUser, patientId),
      (error) => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED',
    );

    await createPatientSession({
      patientId,
      doctorId: doctor.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const authorizedPatients = await getAuthorizedPatients(doctor.id);
    assert.ok(authorizedPatients.some((patient) => patient.id === patientId));

    const prescription = await createDoctorPrescription(doctorUser, {
      patientId,
      medicine: 'Integration Medicine',
      dosage: '10 mg',
      duration: '5 days',
      instructions: 'Take once daily after food.',
    });
    assert.equal(prescription.patient_id, patientId);

    const labProfile = await createProfile({
      userId: labUserId,
      email: 'flow.lab@example.com',
      fullName: 'Flow Laboratory Operator',
      role: 'LAB',
      labName: 'Flow Diagnostic Centre',
      licenseNumber: 'DGHS-FLOW-001',
    });
    await query(
      `UPDATE public.laboratories SET verification_status = 'VERIFIED' WHERE id = $1`,
      [labProfile.laboratory_id],
    );
    const laboratory = await getVerifiedLab(labUserId);

    const reportRequest = await createReportRequest(doctorUser, {
      patientId,
      laboratoryId: laboratory.id,
      testName: 'Integration Blood Test',
    });
    await uploadAssignedReport(laboratory, {
      reportId: reportRequest.id,
      status: 'PROCESSING',
    });
    const completedReport = await uploadAssignedReport(laboratory, {
      reportId: reportRequest.id,
      status: 'COMPLETED',
      fileUrl: 'https://example.invalid/reports/integration-flow.pdf',
      result: 'Integration result metadata.',
    });
    assert.equal(completedReport.status, 'COMPLETED');

    const assignedReports = await getAssignedReports(laboratory.id);
    assert.ok(assignedReports.some((report) => report.id === reportRequest.id));

    const unrelatedReports = await getPatientReports(
      { id: labUserId, role: 'LAB' },
      '20000000-0000-4000-8000-000000000001',
    );
    assert.deepEqual(unrelatedReports, []);

    const adminUserId = '00000000-0000-4000-8000-000000000004';
    const users = await getUsers();
    assert.ok(users.some((user) => user.id === patientUserId));
    assert.deepEqual(
      await authorizePatientDataAccess({ id: adminUserId, role: 'ADMIN' }, patientId),
      { role: 'ADMIN' },
    );

    const suspended = await verifyEntity({
      id: laboratory.id,
      entityType: 'LAB',
      status: 'SUSPENDED',
      adminUserId,
    });
    assert.equal(suspended.verification_status, 'SUSPENDED');

    const verified = await verifyEntity({
      id: laboratory.id,
      entityType: 'LAB',
      status: 'VERIFIED',
      adminUserId,
    });
    assert.equal(verified.verification_status, 'VERIFIED');
  } finally {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await cleanupIntegrationData(query);
    await closeDatabase();
  }
});
