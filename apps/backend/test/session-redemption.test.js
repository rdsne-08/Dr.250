import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { createPatientSession, redeemPatientSession } = await import('../src/modules/sessions/services/session.service.js');
const { authorizePatientDataAccess } = await import('../src/modules/sessions/services/access.service.js');

const doctor = { id: 'bound-user', role: 'DOCTOR' };
const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('issuing access binds a verified doctor and stores only a credential digest', async () => {
  const calls = [];
  const database = { async query(sql, values) {
    calls.push({ sql, values });
    return { rows: [{ id: 'session-1', patient_id: 'patient-1', doctor_id: 'doctor-1', status: 'PENDING' }] };
  } };
  const session = await createPatientSession({ patientId: 'patient-1', doctorId: 'doctor-1',
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() }, database);
  assert.equal(session.status, 'PENDING');
  assert.match(session.access_token, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(calls[0].values[2], createHash('sha256').update(session.access_token).digest('hex'));
  assert.ok(!JSON.stringify(calls).includes(session.access_token));
  assert.match(calls[0].sql, /doctor\.verification_status = 'VERIFIED'/);
});

test('pending session cannot grant doctor access before redemption', async () => {
  const database = { query: async () => ({ rows: [{
    id: 'doctor-1', verification_status: 'VERIFIED', authorized: false,
  }] }) };
  await assert.rejects(authorizePatientDataAccess(doctor, 'patient-1', database),
    error => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED');
});

test('bound verified doctor redeems once with an atomic pending to active update', async () => {
  const calls = [];
  let status = 'PENDING';
  const database = { async query(sql, values) {
    calls.push({ sql, values });
    if (sql.includes('UPDATE public.access_sessions AS session')) {
      if (status === 'PENDING') { status = 'ACTIVE'; return { rows: [{ id: 'session-1', status }] }; }
      return { rows: [] };
    }
    return { rows: [{ status, revoked_at: null, expired: false }] };
  } };
  assert.equal((await redeemPatientSession(doctor, token, database)).status, 'ACTIVE');
  await assert.rejects(redeemPatientSession(doctor, token, database),
    error => error.statusCode === 409 && error.code === 'PIN_ALREADY_USED');
  const update = calls.find(({ sql }) => sql.includes('UPDATE public.access_sessions AS session'));
  assert.match(update.sql, /session\.status = 'PENDING' AND session\.revoked_at IS NULL/);
  assert.match(update.sql, /doctor\.verification_status = 'VERIFIED'/);
  assert.match(update.sql, /session\.expires_at > clock_timestamp\(\)/);
  assert.deepEqual(update.values, [createHash('sha256').update(token).digest('hex'), doctor.id]);
});

test('wrong doctor cannot redeem a bound credential', async () => {
  const database = { async query(sql) {
    if (sql.includes('private.session_redemption_limits')) return { rows: [{ attempts: 1 }] };
    if (sql.includes('UPDATE public.access_sessions AS session')) return { rows: [] };
    return { rows: [] };
  } };
  await assert.rejects(redeemPatientSession({ id: 'other-doctor', role: 'DOCTOR' }, token, database),
    error => error.statusCode === 400 && error.code === 'PIN_INVALID');
});

for (const [name, state, code] of [
  ['expired', { status: 'PENDING', revoked_at: null, expired: true }, 'PIN_EXPIRED'],
  ['revoked', { status: 'PENDING', revoked_at: new Date(), expired: false }, 'PIN_REVOKED'],
]) {
  test(`${name} credential cannot be redeemed`, async () => {
    const database = { async query(sql) {
      if (sql.includes('UPDATE public.access_sessions AS session')) return { rows: [] };
      return { rows: [state] };
    } };
    await assert.rejects(redeemPatientSession(doctor, token, database),
      error => error.code === code);
  });
}

test('two concurrent redemptions have one winner and replay is rejected', async () => {
  let pending = true;
  const database = { async query(sql) {
    if (sql.includes('UPDATE public.access_sessions AS session')) {
      if (!pending) return { rows: [] };
      pending = false;
      await new Promise(resolve => setTimeout(resolve, 5));
      return { rows: [{ id: 'session-1', status: 'ACTIVE' }] };
    }
    return { rows: [{ status: 'ACTIVE', revoked_at: null, expired: false }] };
  } };
  const outcomes = await Promise.allSettled([
    redeemPatientSession(doctor, token, database),
    redeemPatientSession(doctor, token, database),
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(result => result.status === 'rejected').reason.code, 'PIN_ALREADY_USED');
});

test('rate limit counts malformed and incorrect credentials before validation', async () => {
  let attempts = 0;
  const database = { async query(sql) {
    if (sql.includes('private.session_redemption_limits')) return { rows: [{ attempts: ++attempts }] };
    return { rows: [] };
  } };
  for (let index = 0; index < 5; index += 1) {
    await assert.rejects(redeemPatientSession(doctor, 'invalid', database),
      error => error.code === 'PIN_INVALID');
  }
  await assert.rejects(redeemPatientSession(doctor, 'invalid', database),
    error => error.statusCode === 429 && error.code === 'PIN_RATE_LIMITED');
});
