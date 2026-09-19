import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { shutdown, startServer } = await import('../src/server.js');

test('server starts on an HTTP port and shuts down gracefully', async () => {
  const server = startServer({ host: '127.0.0.1', port: 0 });
  if (!server.listening) await once(server, 'listening');

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);

  await shutdown('test', { closeDatabasePool: false, exitProcess: false });
  assert.equal(server.listening, false);
});
