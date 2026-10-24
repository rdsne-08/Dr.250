import assert from 'node:assert/strict';
import test from 'node:test';

if (process.env.AUTH_INTEGRATION_URL) process.env.DATABASE_URL = process.env.AUTH_INTEGRATION_URL;
const { hashPassword, verifyPassword } = await import('../src/modules/auth/services/local-auth.service.js');

test('passwords are salted and incorrect passwords fail comparison', async () => {
  const first = await hashPassword('patient-password');
  const second = await hashPassword('patient-password');
  assert.notEqual(first, second);
  assert.ok(!first.includes('patient-password'));
  assert.equal(await verifyPassword('patient-password', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
});

test('registration persists a patient; login, duplicates, wrong password, session and logout work', {
  skip: !process.env.AUTH_INTEGRATION_URL && 'Set AUTH_INTEGRATION_URL to a migrated disposable loopback database.',
}, async () => {
  const url = new URL(process.env.AUTH_INTEGRATION_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const [{ createApp }, { query, closeDatabase }] = await Promise.all([
    import('../src/app.js'), import('../src/database/pool.js'),
  ]);
  const server = await new Promise(resolve => {
    const listener = createApp().listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const email = `auth.${Date.now()}@example.invalid`;
  const password = 'Release-password-123!';
  const userIds = [];
  async function post(path, body, token) {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  try {
    const registration = { email, password, full_name: 'Auth Test Patient', role: 'PATIENT' };
    const created = await post('/api/auth/register', registration);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.user.role, 'PATIENT');
    const userId = created.body.data.user.user_id;
    userIds.push(userId);
    const row = (await query('SELECT password_hash FROM private.account_credentials WHERE user_id=$1', [userId])).rows[0];
    assert.ok(row.password_hash.startsWith('scrypt:'));
    assert.ok(!row.password_hash.includes(password));

    const duplicate = await post('/api/auth/register', registration);
    assert.equal(duplicate.status, 409);
    const wrong = await post('/api/auth/login', { email, password: 'wrong-password' });
    assert.equal(wrong.status, 401);
    const login = await post('/api/auth/login', { email, password });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.role, 'PATIENT');
    const token = login.body.data.access_token;
    assert.ok(token.startsWith('dr250_'));
    const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await me.json()).data.role, 'PATIENT');
    assert.equal((await post('/api/auth/logout', {}, token)).status, 204);
    const revoked = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(revoked.status, 401);
    for (const [role, extra] of [
      ['DOCTOR', { specialization: 'General', license_number: 'TEST-BMDC' }],
      ['LAB', { lab_name: 'Test Lab', license_number: 'TEST-LAB' }],
    ]) {
      const provider = await post('/api/auth/register', {
        ...registration, email: `${role.toLowerCase()}.${email}`, role, ...extra,
      });
      assert.equal(provider.status, 201);
      assert.equal(provider.body.data.user.verification_status, 'PENDING');
      userIds.push(provider.body.data.user.user_id);
    }
    const admin = await post('/api/auth/register', { ...registration, role: 'ADMIN' });
    assert.equal(admin.status, 400);
  } finally {
    for (const userId of userIds) await query('DELETE FROM public.users WHERE id=$1', [userId]);
    await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  }
});
