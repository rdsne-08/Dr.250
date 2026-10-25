import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getOwnAccessLogs, logProviderRead } from '../src/modules/sessions/services/audit.service.js';
import { verifyEntity } from '../src/modules/admin/services/admin.service.js';
const disposable = process.env.DR250_DISPOSABLE_URL;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const git = (...args) => execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
const sql = source => source.replace(/^\s*\\set[^\n]*$/gm, '');
const hash = source => createHash('sha256').update(source).digest('hex');

test('fresh and historical databases migrate without data loss; approvals and patient logs persist', {
  skip: !disposable && 'Set DR250_DISPOSABLE_URL to a disposable loopback dr250_release_* database.',
}, async () => {
  const url = new URL(disposable);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const admin = new pg.Client({ connectionString: disposable }); await admin.connect();
  try {
    for (const variant of ['fresh', 'historical', 'nonai']) {
      const name = `dr250_release_${variant}`;
      // Refuse existing resources; this test never resets a database.
      await admin.query(`CREATE DATABASE ${name} TEMPLATE template0`);
      const target = new URL(disposable); target.pathname = '/' + name;
      const client = new pg.Client({ connectionString: target.href }); await client.connect();
      const pool = new pg.Pool({ connectionString: target.href });
      try {
        if (variant !== 'fresh') {
          const ref = variant === 'historical' ? '12b9fe3' : '8d2325b';
          const names = git('ls-tree', '-r', '--name-only', ref, 'database/migrations').trim().split(/\r?\n/).filter(name => /\d{3}_.+\.sql$/.test(name));
          await client.query('CREATE SCHEMA dr250_meta; CREATE TABLE dr250_meta.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz DEFAULT now())');
          for (const path of [...names, 'database/policies.sql']) {
            const source = git('show', `${ref}:${path}`);
            await client.query(sql(source));
            await client.query('INSERT INTO dr250_meta.schema_migrations(name,checksum) VALUES ($1,$2)', [path.split('/').at(-1), hash(source)]);
          }
        }
        const migrate = () => execFileSync(process.execPath, ['--import', './scripts/test-env.js', 'scripts/migrate.js'], {
          env: { ...process.env, DR250_DISPOSABLE_URL: target.href }, encoding: 'utf8',
        });
        migrate(); migrate(); // Idempotence, including unchanged historical ledger.
        if (variant === 'historical') {
          assert.equal((await client.query("SELECT to_regclass('public.medical_embeddings') IS NOT NULL AS present")).rows[0].present, true);
          assert.equal((await client.query("SELECT checksum FROM dr250_meta.schema_migrations WHERE name='001_extensions.sql'")).rows[0].checksum,
            hash(git('show', '12b9fe3:database/migrations/001_extensions.sql')));
        }
        const ids = Array.from({ length: 4 }, (_, i) => `99000000-0000-4000-8000-00000000000${i + 1}`);
        for (const [index, role] of ['PATIENT', 'PATIENT', 'DOCTOR', 'ADMIN'].entries()) {
          await client.query('INSERT INTO public.users(id,email) VALUES ($1,$2)', [ids[index], `release${index}@example.invalid`]);
          await client.query('INSERT INTO public.profiles(id,user_id,full_name,role) VALUES ($1,$1,$2,$3)', [ids[index], `Release fixture ${index}`, role]);
        }
        for (const id of ids.slice(0, 2)) await client.query('INSERT INTO public.patients(id,profile_id) VALUES ($1,$1)', [id]);
        await client.query("INSERT INTO public.doctors(id,profile_id,specialization,license_number) VALUES ($1,$1,'General','RELEASE-LICENSE')", [ids[2]]);
        await verifyEntity({ id: ids[2], entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: ids[3] }, pool);
        assert.equal((await client.query('SELECT verification_status FROM public.doctors WHERE id=$1', [ids[2]])).rows[0].verification_status, 'VERIFIED');
        await client.query("INSERT INTO public.access_sessions(patient_id,doctor_id,access_token,expires_at,status) VALUES ($1,$2,repeat('a',64),now()+interval '1 hour','ACTIVE')", [ids[0], ids[2]]);
        await logProviderRead({ id: ids[2], role: 'DOCTOR' }, ids[0], 'RECORDS_READ', pool);
        assert.equal((await getOwnAccessLogs(ids[0], pool)).length, 1);
        assert.equal((await getOwnAccessLogs(ids[1], pool)).length, 0);
        assert.ok((await client.query('SELECT last_accessed_at FROM public.access_sessions')).rows[0].last_accessed_at);
        if (variant === 'historical') {
          const record = await client.query("INSERT INTO public.medical_records(patient_id,title,record_type) VALUES ($1,'Preserved fixture','DIAGNOSIS') RETURNING id", [ids[0]]);
          await client.query('INSERT INTO public.medical_embeddings(medical_record_id,embedding) VALUES ($1,array_fill(0::real, ARRAY[1536])::vector)', [record.rows[0].id]);
          migrate();
          assert.equal((await client.query('SELECT count(*)::int AS n FROM public.medical_embeddings')).rows[0].n, 1);
        }
        // Unknown ledger checksums must still stop migration.
        await client.query("UPDATE dr250_meta.schema_migrations SET checksum='unknown' WHERE name='001_extensions.sql'");
        assert.throws(migrate);
      } finally { await pool.end(); await client.end(); }
    }
  } finally { await admin.end(); }
});
