import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { createApp } = await import('../src/app.js');

async function listen(application) {
  const server = await new Promise((resolve) => {
    const listeningServer = application.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

let connected;
let unavailable;

before(async () => {
  connected = await listen(createApp({ databaseCheck: async () => true }));
  unavailable = await listen(createApp({ databaseCheck: async () => {
    throw new Error('database unavailable');
  } }));
});

after(async () => {
  await Promise.all([close(connected.server), close(unavailable.server)]);
});

test('GET /api/health reports application readiness without querying the database', async () => {
  const response = await fetch(`${connected.baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: {
      service: 'Dr.250 backend',
      status: 'ok',
    },
  });
});

test('GET /api/health/database reports a connected database', async () => {
  const response = await fetch(`${connected.baseUrl}/api/health/database`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    database: 'connected',
  });
});

test('GET /api/health/database reports database failure without leaking diagnostics', async () => {
  const response = await fetch(`${unavailable.baseUrl}/api/health/database`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'The database connection is unavailable.',
    error: 'DATABASE_UNAVAILABLE',
  });
});

test('unknown routes use the standard error response', async () => {
  const response = await fetch(`${connected.baseUrl}/api/not-a-route`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error, 'NOT_FOUND');
});
