import assert from 'node:assert/strict';
import test from 'node:test';
import { createPatientSession, revokePatientSession } from '../src/modules/sessions/services/session.service.js';
import { authorizePatientDataAccess } from '../src/modules/sessions/services/access.service.js';

test('patient grant directly activates a verified doctor connection without exposing a credential', async () => {
  const database = { query: async (sql, values) => {
    assert.match(sql, /doctor\.verification_status = 'VERIFIED'/);
    assert.match(sql, /'ACTIVE'/);
    assert.equal(values[0], 'patient-1');
    assert.equal(values[1], 'doctor-1');
    assert.match(values[2], /^[0-9a-f]{64}$/);
    return { rows: [{ id: 'connection-1', status: 'ACTIVE' }] };
  } };
  assert.deepEqual(await createPatientSession({ patientId: 'patient-1', doctorId: 'doctor-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString() }, database),
  { id: 'connection-1', status: 'ACTIVE' });
});

test('revoked access is denied for a doctor', async () => {
  let revoked = false;
  const database = { query: async (sql) => {
    if (sql.includes('UPDATE public.access_sessions')) {
      revoked = true;
      return { rows: [{ id: 'connection-1', revoked_at: new Date() }] };
    }
    return { rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: !revoked }] };
  } };
  const doctor = { id: 'doctor-user', role: 'DOCTOR' };
  assert.equal((await authorizePatientDataAccess(doctor, 'patient-1', database)).doctorId, 'doctor-1');
  await revokePatientSession('connection-1', 'patient-1', database);
  await assert.rejects(authorizePatientDataAccess(doctor, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
});
