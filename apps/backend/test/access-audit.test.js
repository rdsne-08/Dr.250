import assert from 'node:assert/strict';
import test from 'node:test';
import { getMedicalRecords } from '../src/modules/medical-records/services/medical-record.service.js';

const doctor = { id: 'doctor-user', role: 'DOCTOR' };

test('authorized doctor record read writes a resource event with an active connection', async () => {
  const calls = [];
  const database = { async query(sql, values) {
    calls.push({ sql, values });
    if (sql.includes('AS authorized')) return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: true }] };
    if (sql.includes('FROM public.medical_records')) return { rows: [{ id: 'record-1', title: 'Diagnosis' }] };
    if (sql.includes('INSERT INTO public.audit_logs')) return { rows: [{ id: 'event-1' }] };
    throw new Error('Unexpected query');
  } };
  assert.equal((await getMedicalRecords(doctor, 'patient-1', database))[0].id, 'record-1');
  assert.match(calls[2].sql, /session\.status = 'ACTIVE'/);
  assert.match(calls[2].sql, /session\.revoked_at IS NULL/);
  assert.deepEqual(calls[2].values, ['doctor-user', 'patient-1', 'RECORDS_READ', 'DOCTOR', 'MEDICAL_RECORDS', 'patient-1']);
});

test('doctor with no active connection cannot read records or create an access event', async () => {
  const calls = [];
  const database = { async query(sql) {
    calls.push(sql);
    return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: false }] };
  } };
  await assert.rejects(getMedicalRecords(doctor, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
  assert.equal(calls.length, 1);
});

test('revocation during a record read prevents the audit authorization statement', async () => {
  const database = { async query(sql) {
    if (sql.includes('AS authorized')) return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: true }] };
    if (sql.includes('FROM public.medical_records')) return { rows: [] };
    return { rows: [] };
  } };
  await assert.rejects(getMedicalRecords(doctor, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
});
