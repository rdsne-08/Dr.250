import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isCompatibleHistoricalChecksum } from '../scripts/migration-compatibility.js';
import { logProviderRead, getOwnAccessLogs } from '../src/modules/sessions/services/audit.service.js';
import { verifyEntity } from '../src/modules/admin/services/admin.service.js';
const digest = source => createHash('sha256').update(source).digest('hex');
test('only exact historical migration snapshots are compatible; altered SQL fails closed', () => {
  for (const [name, path] of [['001_extensions.sql', 'database/migrations/001_extensions.sql'], ['policies.sql', 'database/policies.sql']]) {
    const old = execFileSync('git', ['show', `12b9fe3:${path}`], { encoding: 'utf8' });
    const current = execFileSync('git', ['show', `8d2325b:${path}`], { encoding: 'utf8' });
    assert.equal(isCompatibleHistoricalChecksum(name, digest(old), digest(current)), true);
    assert.equal(isCompatibleHistoricalChecksum(name, digest(old.replace(/\n/g, '\r\n')), digest(current)), true);
    assert.equal(isCompatibleHistoricalChecksum(name, digest(old + '--tampered'), digest(current)), false);
    assert.equal(isCompatibleHistoricalChecksum(name, digest(old), digest(current + '--tampered')), false);
  }
});
test('provider audit contains actor, patient, action and resource; patients generate no provider event', async () => {
  const calls = [];
  const db = { query: async (...args) => { calls.push(args); return { rows: [{ id: 'event-1' }] }; } };
  await logProviderRead({ id: 'u', role: 'PATIENT' }, 'p', 'RECORDS_READ', db);
  assert.equal(calls.length, 0);
  await logProviderRead({ id: 'd', role: 'DOCTOR', credential: 'secret' }, 'p', 'RECORDS_READ', db);
  assert.deepEqual(calls[0][1], ['d', 'p', 'RECORDS_READ', 'DOCTOR', 'PATIENT', 'p']);
  assert.match(calls[0][0], /last_accessed_at = now/);
  assert.ok(!JSON.stringify(calls).includes('secret'));
});
test('access-log lookup scopes to authenticated patient owner, not caller-supplied patient ID', async () => {
  const db = { query: async (sql, values) => {
    assert.match(sql, /owner.user_id = \$1/);
    assert.match(sql, /log.entity_type = 'PATIENT_ACCESS'/);
    assert.deepEqual(values, ['patient-user']); return { rows: [] };
  } };
  assert.deepEqual(await getOwnAccessLogs('patient-user', db), []);
});
test('access-log lookup returns actor, action, resource and timestamp within owner scope', async () => {
  const event = { id: 'event-1', provider_name: 'Dr One', role: 'DOCTOR',
    action: 'RECORDS_READ', resource_type: 'MEDICAL_RECORD', resource_id: 'record-1',
    created_at: new Date('2026-10-24T08:00:00Z') };
  const db = { query: async (sql, values) => {
    assert.deepEqual(values, ['patient-user']);
    for (const field of ['provider_name', 'resource_type', 'resource_id', 'created_at']) {
      assert.match(sql, new RegExp(field));
    }
    assert.match(sql, /owner\.user_id = \$1/);
    return { rows: [event] };
  } };
  assert.deepEqual(await getOwnAccessLogs('patient-user', db), [event]);
});
test('provider verification commits approval and audit together, rolls back failures', async () => {
  for (const failAudit of [false, true]) {
    const statements = [];
    const db = { connect: async () => ({ release() {}, async query(sql) {
      statements.push(sql);
      if (failAudit && sql.includes('INSERT INTO public.audit_logs')) throw new Error('audit unavailable');
      return { rows: [{ id: 'doctor', verification_status: 'VERIFIED' }] };
    } }) };
    const operation = verifyEntity({ id: 'doctor', entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: 'admin' }, db);
    if (failAudit) { await assert.rejects(operation); assert.equal(statements.at(-1), 'ROLLBACK'); }
    else { assert.equal((await operation).verification_status, 'VERIFIED'); assert.equal(statements.at(-1), 'COMMIT'); }
  }
});
