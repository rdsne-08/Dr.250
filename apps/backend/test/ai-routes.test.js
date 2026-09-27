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

test('GET /api/ai/health is available', async () => {
  const response = await fetch(`${baseUrl}/api/ai/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: {
      service: 'Dr.250 AI integration',
      status: 'ok',
    },
  });
});

for (const path of ['/history', '/summary', '/symptoms']) {
  test(`POST /api/ai${path} is registered and protected`, async () => {
    const response = await fetch(`${baseUrl}/api/ai${path}`, { method: 'POST' });

    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'UNAUTHORIZED');
  });
}
