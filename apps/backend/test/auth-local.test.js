import assert from 'node:assert/strict';
import test from 'node:test';

if (process.env.AUTH_INTEGRATION_URL) process.env.DATABASE_URL = process.env.AUTH_INTEGRATION_URL;
const { hashPassword, verifyPassword } = await import('../src/modules/auth/services/local-auth.service.js');
const { registerUser } = await import('../src/modules/auth/services/auth.service.js');

test('passwords are salted and incorrect passwords fail comparison', async () => {
  const first = await hashPassword('patient-password');
  const second = await hashPassword('patient-password');
  assert.notEqual(first, second);
  assert.ok(!first.includes('patient-password'));
  assert.equal(await verifyPassword('patient-password', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
});
test('registration normalizes email and reports duplicate identity without replacing credentials', async () => {
  const accounts = new Map();
  const dependencies = {
    passwordHasher: async password => `hash:${password}`,
    persistProfile: async profile => {
      if (accounts.has(profile.email)) throw Object.assign(new Error('duplicate'), { code: '23505' });
      accounts.set(profile.email, profile);
      return profile;
    },
  };
  const input = { email: '  Patient@Example.Invalid  ', password: 'first-secret',
    fullName: 'First Name', role: 'PATIENT' };
  const created = await registerUser(input, dependencies);
  assert.equal(created.email, 'patient@example.invalid');
  await assert.rejects(registerUser({ ...input, email: 'PATIENT@example.invalid',
    fullName: 'Different Name', password: 'second-secret' }, dependencies),
  error => error.statusCode === 409 && /email already exists/.test(error.message));
  assert.equal(accounts.size, 1);
  assert.equal(accounts.get(created.email).passwordHash, 'hash:first-secret');
  await assert.rejects(registerUser({ ...input, email: 'new@example.invalid' }, {
    passwordHasher: dependencies.passwordHasher,
    persistProfile: async () => { throw Object.assign(new Error('license conflict'), {
      code: '23505', constraint: 'doctors_license_number_key',
    }); },
  }), error => error.statusCode === 409 && /provider details/.test(error.message));
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

    const duplicate = await post('/api/auth/register', { ...registration,
      email: `  ${email.toUpperCase()}  `, full_name: 'Another Patient', password: 'Other-password-123!' });
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.body.message, /email already exists/);
    const concurrentEmail = `concurrent.${email}`;
    const concurrent = await Promise.all([
      post('/api/auth/register', { ...registration, email: concurrentEmail, full_name: 'First' }),
      post('/api/auth/register', { ...registration, email: ` ${concurrentEmail.toUpperCase()} `,
        full_name: 'Second', password: 'Other-password-123!' }),
    ]);
    assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 409]);
    userIds.push(concurrent.find(result => result.status === 201).body.data.user.user_id);
    assert.equal((await query('SELECT count(*)::int AS count FROM public.users WHERE lower(btrim(email))=$1',
      [concurrentEmail])).rows[0].count, 1);
    assert.equal((await query('SELECT count(*)::int AS count FROM public.users WHERE lower(btrim(email))=$1',
      [email])).rows[0].count, 1);
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
    const lab = await post('/api/auth/register', { ...registration, role: 'LAB' });
    assert.equal(lab.status, 400);
  } finally {
    for (const userId of userIds) await query('DELETE FROM public.users WHERE id=$1', [userId]);
    await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  }
});
