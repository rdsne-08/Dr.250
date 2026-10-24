import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { getMedicalRecords } = await import('../src/modules/medical-records/services/medical-record.service.js');
const { sendReportDownload } = await import('../src/modules/reports/controllers/report.controller.js');
const { getAuthorizedReportFile } = await import('../src/modules/reports/services/report.service.js');
const { logProviderRead } = await import('../src/modules/sessions/services/audit.service.js');

const doctor = { id: 'doctor-user', role: 'DOCTOR', token: 'never-log-this' };

test('authorized doctor record read writes a resource event and touches one active session', async () => {
  const calls = [];
  const database = { async query(sql, values) {
    calls.push({ sql, values });
    if (sql.includes('AS authorized')) return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: true }] };
    if (sql.includes('FROM public.medical_records')) return { rows: [{ id: 'record-1', patient_id: 'patient-1', title: 'Diagnosis' }] };
    if (sql.includes('INSERT INTO public.audit_logs')) return { rows: [{ id: 'event-1' }] };
    throw new Error('Unexpected query');
  } };
  const records = await getMedicalRecords(doctor, 'patient-1', database);
  assert.equal(records[0].id, 'record-1');
  assert.equal(calls.length, 3);
  assert.match(calls[2].sql, /last_accessed_at = now\(\)/);
  assert.match(calls[2].sql, /doctor\.verification_status = 'VERIFIED'/);
  assert.match(calls[2].sql, /session\.status = 'ACTIVE'/);
  assert.match(calls[2].sql, /session\.revoked_at IS NULL AND session\.expires_at > now\(\)/);
  assert.match(calls[2].sql, /FROM touched RETURNING id/);
  assert.deepEqual(calls[2].values, ['doctor-user', 'patient-1', 'RECORDS_READ', 'DOCTOR', 'MEDICAL_RECORDS', 'patient-1']);
  assert.ok(!JSON.stringify(calls).includes(doctor.token));
});

test('doctor with no active session cannot read records or create an access event', async () => {
  const calls = [];
  const database = { async query(sql) {
    calls.push(sql);
    return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: false }] };
  } };
  await assert.rejects(getMedicalRecords(doctor, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
  assert.equal(calls.length, 1);
});

test('a session revoked after authorization prevents the doctor access event', async () => {
  const database = { async query(sql) {
    if (sql.includes('AS authorized')) return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: true }] };
    if (sql.includes('FROM public.medical_records')) return { rows: [] };
    return { rows: [] };
  } };
  await assert.rejects(getMedicalRecords(doctor, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
});

test('authorized report download identifies its report and patient without logging secrets', async () => {
  const calls = [];
  const response = { download(file, name, complete) {
    calls.push(['download', file, name]); complete();
  } };
  await sendReportDownload(doctor, 'report-1', response, {
    getReport: async () => ({ id: 'report-1', patient_id: 'patient-1', test_name: 'Blood Count', status: 'COMPLETED' }),
    findFile: async () => 'C:/reports/report-1.pdf',
    logAccess: async (...args) => { calls.push(['audit', ...args]); },
  });
  assert.deepEqual(calls[0], ['download', 'C:/reports/report-1.pdf', 'Blood-Count.pdf']);
  assert.deepEqual(calls[1], ['audit', doctor, 'patient-1', 'REPORT_DOWNLOAD_AUTHORIZED', undefined,
    { type: 'LAB_REPORT', id: 'report-1' }]);
});

test('denied or unavailable report download emits no access event', async () => {
  let auditCalls = 0;
  const response = { download() { throw new Error('Download must not start'); } };
  const logAccess = async () => { auditCalls += 1; };
  await assert.rejects(sendReportDownload(doctor, 'report-1', response, {
    getReport: async () => { throw new Error('Access denied'); }, logAccess,
  }));
  await assert.rejects(sendReportDownload(doctor, 'report-1', response, {
    getReport: async () => ({ id: 'report-1' }),
    findFile: async () => { throw new Error('File unavailable'); }, logAccess,
  }));
  assert.equal(auditCalls, 0);
});

test('interrupted report transfer emits no completed download event', async () => {
  let auditCalls = 0;
  await assert.rejects(sendReportDownload(doctor, 'report-1', {
    download(_file, _name, complete) { complete(new Error('Transfer interrupted')); },
  }, {
    getReport: async () => ({ id: 'report-1', patient_id: 'patient-1', test_name: 'CBC' }),
    findFile: async () => 'C:/reports/report-1.pdf',
    logAccess: async () => { auditCalls += 1; },
  }), /Transfer interrupted/);
  assert.equal(auditCalls, 0);
});

test('another patient cannot access a completed report or cause an audit event', async () => {
  let queries = 0;
  const database = { async query(sql) {
    queries += 1;
    if (sql.includes('FROM public.lab_reports')) return { rows: [{
      id: 'report-1', patient_id: 'patient-other', laboratory_id: 'lab-1',
      test_name: 'CBC', file_url: '/report-1.pdf', status: 'COMPLETED',
    }] };
    return { rows: [] };
  } };
  const user = { id: 'patient-user', role: 'PATIENT' };
  await assert.rejects(getAuthorizedReportFile(user, 'report-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
  await logProviderRead(user, 'patient-other', 'REPORT_DOWNLOAD_AUTHORIZED', database,
    { type: 'LAB_REPORT', id: 'report-1' });
  assert.equal(queries, 2);
});
