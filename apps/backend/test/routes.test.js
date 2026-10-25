import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { app } = await import('../src/app.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

const protectedRoutes = [
  ['GET', '/api/auth/me'],
  ['GET', '/api/patients/profile'],
  ['GET', '/api/doctors/profile'],
  ['GET', '/api/admin/doctors'],
  ['GET', '/api/medical-records/00000000-0000-4000-8000-000000000001'],
  ['GET', '/api/prescriptions/00000000-0000-4000-8000-000000000001'],
  ['GET', '/api/sessions'],
  ['GET', '/api/sessions/doctors'],
  ['POST', '/api/doctors/prescriptions'],
  ['POST', '/api/medical-records'],
  ['POST', '/api/prescriptions'],
  ['POST', '/api/sessions'],
  ['PATCH', '/api/admin/verify/00000000-0000-4000-8000-000000000001'],
  ['PATCH', '/api/sessions/00000000-0000-4000-8000-000000000001/revoke'],
];

for (const [method, path] of protectedRoutes) {
  test(`${method} ${path} is registered and protected`, async () => {
    const response = await fetch(`${baseUrl}${path}`, { method });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, {
      success: false,
      message: 'A Bearer access token is required.',
      error: 'UNAUTHORIZED',
    });
  });
}
