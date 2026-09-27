import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../../../');
const databaseDirectory = path.join(projectRoot, 'database');

dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const { Client } = pg;
const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const migrationArtifacts = new Map([
  ['001_extensions.sql', { type: 'extensions', names: ['pgcrypto', 'vector'] }],
  ['002_users.sql', { type: 'table', name: 'users' }],
  ['003_profiles.sql', { type: 'table', name: 'profiles' }],
  ['004_patients.sql', { type: 'table', name: 'patients' }],
  ['005_doctors.sql', { type: 'table', name: 'doctors' }],
  ['006_laboratories.sql', { type: 'table', name: 'laboratories' }],
  ['007_medical_records.sql', { type: 'table', name: 'medical_records' }],
  ['008_prescriptions.sql', { type: 'table', name: 'prescriptions' }],
  ['009_lab_reports.sql', { type: 'table', name: 'lab_reports' }],
  ['010_access_sessions.sql', { type: 'table', name: 'access_sessions' }],
  ['011_audit_logs.sql', { type: 'table', name: 'audit_logs' }],
  ['012_embeddings.sql', { type: 'table', name: 'medical_embeddings' }],
]);

const expectedColumns = {
  users: ['id', 'email', 'created_at', 'updated_at'],
  profiles: ['id', 'user_id', 'full_name', 'phone', 'role', 'created_at', 'updated_at'],
  patients: [
    'id', 'profile_id', 'date_of_birth', 'gender', 'blood_group',
    'emergency_contact', 'created_at', 'updated_at',
  ],
  doctors: [
    'id', 'profile_id', 'specialization', 'license_number',
    'verification_status', 'created_at', 'updated_at',
  ],
  laboratories: [
    'id', 'profile_id', 'lab_name', 'license_number',
    'verification_status', 'created_at', 'updated_at',
  ],
  medical_records: [
    'id', 'patient_id', 'title', 'description', 'document_url',
    'record_type', 'created_at', 'updated_at',
  ],
  prescriptions: [
    'id', 'patient_id', 'doctor_id', 'medicine', 'dosage', 'duration',
    'instructions', 'created_at', 'updated_at',
  ],
  lab_reports: [
    'id', 'patient_id', 'laboratory_id', 'requested_by_doctor_id', 'test_name',
    'report_url', 'status', 'created_at', 'updated_at',
  ],
  access_sessions: [
    'id', 'patient_id', 'doctor_id', 'access_token', 'expires_at', 'revoked_at',
    'last_accessed_at', 'created_at', 'updated_at',
  ],
  audit_logs: [
    'id', 'user_id', 'action', 'entity_type', 'entity_id', 'metadata',
    'ip_address', 'created_at',
  ],
  medical_embeddings: [
    'id', 'medical_record_id', 'patient_id', 'chunk_index', 'content',
    'embedding', 'source_updated_at', 'created_at', 'updated_at',
  ],
};

function checksum(source) {
  return createHash('sha256').update(source).digest('hex');
}

function executableSql(source) {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/^\s*\\set[^\r\n]*(?:\r?\n|$)/gm, '')
    .replace(/^\s*BEGIN;\s*/i, '')
    .replace(/\s*COMMIT;\s*$/i, '')
    .trim();
}

async function artifactExists(artifact) {
  if (artifact.type === 'table') {
    const result = await client.query(
      `SELECT to_regclass($1) IS NOT NULL AS present`,
      [`public.${artifact.name}`],
    );
    return result.rows[0].present;
  }

  const result = await client.query(
    `SELECT count(*)::int AS count FROM pg_extension WHERE extname = ANY($1::text[])`,
    [artifact.names],
  );
  return result.rows[0].count === artifact.names.length;
}

async function recordBaseline(name, digest) {
  await client.query(
    `INSERT INTO dr250_meta.schema_migrations (name, checksum) VALUES ($1, $2)`,
    [name, digest],
  );
  console.log(`Baselined ${name}`);
}

async function applyMigration(name, source, digest) {
  await client.query('BEGIN');
  try {
    await client.query(executableSql(source));
    await client.query(
      `INSERT INTO dr250_meta.schema_migrations (name, checksum) VALUES ($1, $2)`,
      [name, digest],
    );
    await client.query('COMMIT');
    console.log(`Applied ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function migrateFile(name, filePath, { allowBaseline = true } = {}) {
  const source = await readFile(filePath, 'utf8');
  const digest = checksum(source);
  const existing = await client.query(
    `SELECT checksum FROM dr250_meta.schema_migrations WHERE name = $1`,
    [name],
  );

  if (existing.rows[0]) {
    if (existing.rows[0].checksum !== digest) {
      throw new Error(`${name} changed after it was applied. Add a new migration instead.`);
    }
    console.log(`Current ${name}`);
    return;
  }

  const artifact = migrationArtifacts.get(name);
  if (allowBaseline && artifact && await artifactExists(artifact)) {
    await recordBaseline(name, digest);
    return;
  }

  await applyMigration(name, source, digest);
}

async function verifySchema() {
  const extensions = await client.query(
    `SELECT extname FROM pg_extension WHERE extname = ANY($1::text[]) ORDER BY extname`,
    [['pgcrypto', 'vector']],
  );
  if (extensions.rowCount !== 2) throw new Error('Required PostgreSQL extensions are missing.');

  const columns = await client.query(
    `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])
    `,
    [Object.keys(expectedColumns)],
  );
  const actual = new Map();
  for (const row of columns.rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
    actual.get(row.table_name).add(row.column_name);
  }
  const missing = [];
  for (const [table, required] of Object.entries(expectedColumns)) {
    for (const column of required) {
      if (!actual.get(table)?.has(column)) missing.push(`${table}.${column}`);
    }
  }
  if (missing.length) throw new Error(`Database columns are missing: ${missing.join(', ')}`);

  const rls = await client.query(
    `
      SELECT relation.relname
      FROM pg_class AS relation
      INNER JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = ANY($1::text[])
        AND relation.relrowsecurity
    `,
    [Object.keys(expectedColumns)],
  );
  if (rls.rowCount !== Object.keys(expectedColumns).length) {
    throw new Error('Row-level security is not enabled on every application table.');
  }

  const policies = await client.query(
    `SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public'`,
  );
  if (policies.rows[0].count < 20) throw new Error('Expected database security policies are missing.');

  console.log(JSON.stringify({
    status: 'verified',
    extensions: extensions.rows.map(({ extname }) => extname),
    applicationTables: Object.keys(expectedColumns).length,
    policies: policies.rows[0].count,
  }));
}

try {
  await client.connect();
  await client.query(`SELECT pg_advisory_lock(hashtext('dr250_database_migrations'))`);
  await client.query(`CREATE SCHEMA IF NOT EXISTS dr250_meta`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS dr250_meta.schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migrationNames = (await readdir(path.join(databaseDirectory, 'migrations')))
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort();
  for (const name of migrationNames) {
    await migrateFile(name, path.join(databaseDirectory, 'migrations', name));
  }
  await migrateFile('policies.sql', path.join(databaseDirectory, 'policies.sql'), {
    allowBaseline: false,
  });
  await verifySchema();
} finally {
  try {
    await client.query(`SELECT pg_advisory_unlock(hashtext('dr250_database_migrations'))`);
  } catch {
    // Connection/setup failures may occur before the advisory lock is acquired.
  }
  await client.end();
}
