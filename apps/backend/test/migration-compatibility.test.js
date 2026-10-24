import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isCompatibleHistoricalChecksum, isLineEndingOnlyChecksum, retiredMigrations } from '../scripts/migration-compatibility.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const digest = source => createHash('sha256').update(source).digest('hex');
const historicalSource = (ref, file) => execFileSync('git', ['show', `${ref}:${file}`], {
  cwd: root,
  encoding: 'utf8',
});

test('fresh extension migration requires pgcrypto without pgvector', () => {
  const source = readFileSync(path.join(root, 'database/migrations/001_extensions.sql'), 'utf8');
  assert.match(source, /CREATE EXTENSION IF NOT EXISTS pgcrypto;/);
  assert.doesNotMatch(source, /\bvector\b/i);
  assert.equal(readdirSync(path.join(root, 'database/migrations')).includes('012_embeddings.sql'), false);
});
test('canonical email migration uses a unique trimmed case-insensitive index', () => {
  const source = readFileSync(path.join(root, 'database/migrations/017_canonical_user_email.sql'), 'utf8');
  assert.match(source, /CREATE UNIQUE INDEX users_email_canonical_uidx/);
  assert.match(source, /lower\(btrim\(email\)\)/);
  assert.doesNotMatch(source, /UPDATE public\.users|ON CONFLICT/i);
});

test('unchanged SQL accepts LF and CRLF ledger checksums only', () => {
  const source = readFileSync(path.join(root, 'database/migrations/002_users.sql'), 'utf8');
  const historical = historicalSource('12b9fe3', 'database/migrations/002_users.sql');
  assert.equal(isLineEndingOnlyChecksum(source, digest(historical)), true);
  assert.equal(isLineEndingOnlyChecksum(source, digest(historical.replace(/\r?\n/g, '\r\n'))), true);
  assert.equal(isLineEndingOnlyChecksum(source, digest(historical + '-- changed')), false);
});

test('only recorded pre-AI migration checksums match the current files', () => {
  for (const file of ['database/migrations/001_extensions.sql', 'database/policies.sql']) {
    const name = path.basename(file);
    const previous = historicalSource('12b9fe3', file);
    const current = readFileSync(path.join(root, file), 'utf8');
    for (const lineEnding of ['\n', '\r\n']) {
      const oldChecksum = digest(previous.replace(/\r?\n/g, lineEnding));
      const currentChecksum = digest(current.replace(/\r?\n/g, lineEnding));
      assert.equal(isCompatibleHistoricalChecksum(name, oldChecksum, currentChecksum), true);
      assert.equal(isCompatibleHistoricalChecksum(name, digest(previous + '-- changed'), currentChecksum), false);
      assert.equal(isCompatibleHistoricalChecksum(name, oldChecksum, digest(current + '-- changed')), false);
    }
  }
  assert.equal(isCompatibleHistoricalChecksum('002_users.sql', 'unknown', 'unknown'), false);
});

test('the retired embedding migration recognizes only its exact historical checksums', () => {
  const source = historicalSource('12b9fe3', 'database/migrations/012_embeddings.sql');
  assert.ok(retiredMigrations['012_embeddings.sql'].includes(digest(source)));
  assert.ok(retiredMigrations['012_embeddings.sql'].includes(digest(source.replace(/\r?\n/g, '\r\n'))));
  assert.equal(retiredMigrations['012_embeddings.sql'].includes(digest(source + '-- changed')), false);
});
