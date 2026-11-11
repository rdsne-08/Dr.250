import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import express from 'express';

const { rateLimit } = await import('../src/modules/auth/middleware/rate-limit.js');

function harness(kind, consume) {
  const middleware = rateLimit(kind, consume);
  const request = { body: { email: 'Patient@Example.Invalid' }, socket: { remoteAddress: '127.0.0.1' } };
  const headers = {};
  const response = { set: (name, value) => { headers[name] = value; } };
  return () => new Promise(resolve => middleware(request, response, error => resolve({ error, headers })));
}

test('login allows normal requests and returns consistent 429 after the account limit', async () => {
  const counts = new Map();
  const request = harness('login', async (bucket, limit) => {
    const attempts = (counts.get(bucket) ?? 0) + 1;
    counts.set(bucket, attempts);
    return { allowed: attempts <= limit, retryAfter: 120 };
  });
  for (let index = 0; index < 10; index += 1) assert.equal((await request()).error, undefined);
  const blocked = await request();
  assert.equal(blocked.error.statusCode, 429);
  assert.equal(blocked.headers['Retry-After'], '120');
  assert.doesNotMatch(blocked.error.message, /patient@example/i);
});

test('registration window resets and accepts requests again', async () => {
  const counts = new Map();
  let reset = false;
  const request = harness('register', async (bucket, limit) => {
    const attempts = (reset ? 0 : counts.get(bucket) ?? 0) + 1;
    counts.set(bucket, attempts);
    return { allowed: attempts <= limit, retryAfter: 20 };
  });
  for (let index = 0; index < 3; index += 1) assert.equal((await request()).error, undefined);
  assert.equal((await request()).error.statusCode, 429);
  reset = true;
  assert.equal((await request()).error, undefined);
});

test('one trusted proxy hop uses the appended client IP, ignoring spoofed earlier hops', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/', (request, response) => response.json({ ip: request.ip }));
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const response = await fetch(url, { headers: { 'X-Forwarded-For': '198.51.100.9, 203.0.113.7' } });
    assert.equal((await response.json()).ip, '203.0.113.7');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('PostgreSQL limiter is atomic across calls and resets after expiry', {
  skip: !process.env.AUTH_INTEGRATION_URL && 'Requires a migrated disposable database.',
}, async () => {
  const url = new URL(process.env.AUTH_INTEGRATION_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const { query, closeDatabase } = await import('../src/database/pool.js');
  const { consumeBucket, cleanupExpiredBuckets } = await import('../src/modules/auth/middleware/rate-limit.js');
  const bucket = `test:${randomUUID()}`;
  try {
    const checks = await Promise.all(Array.from({ length: 4 }, () => consumeBucket(bucket, 3, 60)));
    assert.equal(checks.filter(check => check.allowed).length, 3);
    assert.equal(checks.filter(check => !check.allowed).length, 1);
    await query('UPDATE private.auth_rate_limits SET reset_at = now() - interval \'1 second\' WHERE bucket = $1', [bucket]);
    assert.equal((await consumeBucket(bucket, 3, 60)).allowed, true);
    await query('UPDATE private.auth_rate_limits SET reset_at = now() - interval \'2 days\' WHERE bucket = $1', [bucket]);
    assert.ok((await cleanupExpiredBuckets()) >= 1);
  } finally {
    await query('DELETE FROM private.auth_rate_limits WHERE bucket = $1', [bucket]);
    await closeDatabase();
  }
});
