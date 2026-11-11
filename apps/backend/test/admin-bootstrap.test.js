import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const disposable = process.env.DR250_DISPOSABLE_URL;

test('private production Admin bootstrap is one-time, hashed, and audited', {
  skip: !disposable && 'Requires a migrated disposable loopback database.',
}, async () => {
  const url = new URL(disposable);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const { query, closeDatabase } = await import('../src/database/pool.js');
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/provision-production-admin.js');
  const email = `bootstrap.${randomUUID()}@example.invalid`;
  const password = randomBytes(32).toString('base64url');
  const secret = randomBytes(48).toString('base64url');
  const env = { ...process.env, NODE_ENV: 'production', DATABASE_URL: disposable,
    DR250_ADMIN_BOOTSTRAP_DATABASE_NAME: url.pathname.slice(1),
    DR250_ADMIN_BOOTSTRAP_PASSWORD: password, DR250_ADMIN_BOOTSTRAP_SECRET: secret };
  let userId;
  try {
    const output = execFileSync(process.execPath, [script, email, 'Bootstrap Test Admin'],
      { env, encoding: 'utf8' });
    assert.match(output, /bootstrap permanently consumed/);
    assert.ok(!output.includes(password) && !output.includes(secret));
    const account = await query(`SELECT u.id, c.password_hash FROM public.users u
      JOIN private.account_credentials c ON c.user_id = u.id WHERE u.email = $1`, [email]);
    assert.equal(account.rowCount, 1);
    userId = account.rows[0].id;
    assert.match(account.rows[0].password_hash, /^scrypt:/);
    assert.ok(!account.rows[0].password_hash.includes(password));
    assert.equal((await query('SELECT count(*)::int AS n FROM private.admin_bootstrap')).rows[0].n, 1);
    assert.equal((await query("SELECT count(*)::int AS n FROM public.audit_logs WHERE user_id=$1 AND action='ADMIN_BOOTSTRAPPED'", [userId])).rows[0].n, 1);
    assert.throws(() => execFileSync(process.execPath,
      [script, `second.${email}`, 'Second Test Admin'], { env, stdio: 'pipe' }));
    assert.equal((await query("SELECT count(*)::int AS n FROM public.profiles WHERE role='ADMIN' AND user_id=$1", [userId])).rows[0].n, 1);
  } finally {
    if (userId) {
      await query('DELETE FROM private.admin_bootstrap WHERE admin_user_id=$1', [userId]);
      await query('DELETE FROM public.audit_logs WHERE user_id=$1', [userId]);
      await query('DELETE FROM public.users WHERE id=$1', [userId]);
    }
    await closeDatabase();
  }
});
