import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const disposable = process.env.AUTH_INTEGRATION_URL;
if (disposable) process.env.DATABASE_URL = disposable;

test('Admin reviews doctors, decisions persist, and changed status blocks existing doctor sessions', {
  skip: !disposable && 'Set AUTH_INTEGRATION_URL to a migrated disposable loopback dr250_release_* database.',
}, async () => {
  const url = new URL(disposable);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const [{ createApp }, { query, closeDatabase }, { createProfile }, { hashPassword }] = await Promise.all([
    import('../src/app.js'), import('../src/database/pool.js'),
    import('../src/modules/auth/services/profile.service.js'),
    import('../src/modules/auth/services/local-auth.service.js'),
  ]);
  const server = await new Promise(resolve => {
    const listener = createApp().listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const suffix = Date.now();
  const password = 'Admin-phase1-test-123!';
  const ids = [];
  let patientId;
  let approvedId;
  let rejectedId;
  async function request(method, path, body, token) {
    const response = await fetch(base + path, { method, headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  async function account(role, name, license) {
    const email = `${name}.${suffix}@example.invalid`;
    const created = await request('POST', '/api/auth/register', { email, password,
      full_name: name, role, ...(license ? { specialization: 'General', license_number: license } : {}) });
    assert.equal(created.status, 202, JSON.stringify(created.data));
    const login = await request('POST', '/api/auth/login', { email, password });
    assert.equal(login.status, 200);
    ids.push(login.data.data.user.user_id);
    return login.data.data.access_token;
  }
  try {
    const adminEmail = `admin.${suffix}@example.invalid`;
    const admin = await createProfile({ userId: randomUUID(), email: adminEmail,
      fullName: 'Test Admin', role: 'ADMIN', passwordHash: await hashPassword(password) });
    ids.push(admin.user_id);
    const adminLogin = await request('POST', '/api/auth/login', { email: adminEmail, password });
    assert.equal(adminLogin.status, 200);
    const adminToken = adminLogin.data.data.access_token;
    const patientToken = await account('PATIENT', 'patient', null);
    const approvedToken = await account('DOCTOR', 'approved', String(suffix).slice(-9));
    const rejectedToken = await account('DOCTOR', 'rejected', String(suffix + 1).slice(-9));
    patientId = (await request('GET', '/api/patients/profile', null, patientToken)).data.data.patient.id;
    approvedId = (await request('GET', '/api/doctors/profile', null, approvedToken)).data.data.doctor.id;
    rejectedId = (await request('GET', '/api/doctors/profile', null, rejectedToken)).data.data.doctor.id;
    const listPath = '/api/admin/doctors';
    const decidePath = id => `/api/admin/doctors/${id}/verification`;
    for (const token of [patientToken, approvedToken, rejectedToken]) {
      assert.equal((await request('GET', listPath, null, token)).status, 403);
      assert.equal((await request('PATCH', decidePath(approvedId), { status: 'VERIFIED' }, token)).status, 403);
    }
    const pending = await request('GET', listPath, null, adminToken);
    assert.equal(pending.status, 200);
    assert.ok(pending.data.data.doctors.some(doctor => doctor.id === approvedId && doctor.verification_status === 'PENDING'));
    assert.ok(pending.data.data.doctors.some(doctor => doctor.id === rejectedId && doctor.verification_status === 'PENDING'));
    assert.equal((await request('PATCH', decidePath(approvedId), { status: 'SUSPENDED' }, adminToken)).status, 400);
    assert.equal((await request('PATCH', decidePath('invalid'), { status: 'VERIFIED' }, adminToken)).status, 400);
    for (const field of ['full_name', 'email', 'specialization', 'license_number', 'created_at']) {
      assert.ok(field in pending.data.data.doctors.find(doctor => doctor.id === approvedId));
    }
    assert.equal((await request('GET', `/api/medical-records/${patientId}`, null, approvedToken)).status, 403);
    assert.equal((await request('POST', '/api/doctors/prescriptions', { patient_id: patientId,
      medicine: 'Blocked', dosage: 'Daily', instructions: 'None' }, approvedToken)).status, 403);
    const approve = await request('PATCH', decidePath(approvedId), { status: 'VERIFIED' }, adminToken);
    assert.equal(approve.status, 200, JSON.stringify(approve.data));
    const reject = await request('PATCH', decidePath(rejectedId), { status: 'REJECTED' }, adminToken);
    assert.equal(reject.status, 200, JSON.stringify(reject.data));
    assert.equal((await request('PATCH', decidePath(approvedId), { status: 'REJECTED' }, adminToken)).status, 409);
    assert.equal((await request('PATCH', decidePath(rejectedId), { status: 'VERIFIED' }, adminToken)).status, 409);
    const reviewed = await request('GET', listPath, null, adminToken);
    assert.equal(reviewed.data.data.doctors.find(doctor => doctor.id === approvedId).verification_status, 'VERIFIED');
    assert.equal(reviewed.data.data.doctors.find(doctor => doctor.id === rejectedId).verification_status, 'REJECTED');
    for (const token of [approvedToken, rejectedToken]) {
      assert.equal((await request('GET', listPath, null, token)).status, 403);
      assert.equal((await request('PATCH', decidePath(rejectedId), { status: 'VERIFIED' }, token)).status, 403);
    }
    assert.equal((await query(`SELECT count(*)::int AS count FROM public.audit_logs
      WHERE user_id=$1 AND action='VERIFICATION_STATUS_CHANGED' AND entity_id IN ($2,$3)`,
    [admin.user_id, approvedId, rejectedId])).rows[0].count, 2);
    const concurrentToken = await account('DOCTOR', 'concurrent', String(suffix + 2).slice(-9));
    const concurrentId = (await request('GET', '/api/doctors/profile', null, concurrentToken)).data.data.doctor.id;
    const competing = await Promise.all([
      request('PATCH', decidePath(concurrentId), { status: 'VERIFIED' }, adminToken),
      request('PATCH', decidePath(concurrentId), { status: 'REJECTED' }, adminToken),
    ]);
    assert.deepEqual(competing.map(result => result.status).sort(), [200, 409]);
    assert.equal((await query(`SELECT count(*)::int AS count FROM public.audit_logs
      WHERE user_id=$1 AND action='VERIFICATION_STATUS_CHANGED' AND entity_id=$2`,
    [admin.user_id, concurrentId])).rows[0].count, 1);
    assert.equal((await request('GET', `/api/medical-records/${patientId}`, null, approvedToken)).status, 403);
    assert.equal((await request('POST', '/api/sessions', { doctor_id: approvedId,
      expires_at: new Date(Date.now() + 86400000).toISOString() }, patientToken)).status, 201);
    assert.equal((await request('GET', `/api/medical-records/${patientId}`, null, approvedToken)).status, 200);
    assert.equal((await request('GET', `/api/medical-records/${patientId}`, null, rejectedToken)).status, 403);
    assert.equal((await request('POST', '/api/doctors/prescriptions', { patient_id: patientId,
      medicine: 'Blocked', dosage: 'Daily', instructions: 'None' }, rejectedToken)).status, 403);
  } finally {
    if (patientId && approvedId && rejectedId) {
      await query('DELETE FROM public.prescriptions WHERE patient_id=$1', [patientId]);
      await query('DELETE FROM public.medical_records WHERE patient_id=$1', [patientId]);
    }
    for (const id of ids.reverse()) await query('DELETE FROM public.users WHERE id=$1', [id]);
    await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  }
});
