import { createHash, randomUUID } from 'node:crypto';

import { closeDatabase, withTransaction } from '../src/database/pool.js';
import { hashPassword } from '../src/modules/auth/services/local-auth.service.js';

const email = process.argv[2]?.trim().toLowerCase();
const fullName = process.argv[3]?.trim();
const password = process.env.DR250_ADMIN_BOOTSTRAP_PASSWORD;
const secret = process.env.DR250_ADMIN_BOOTSTRAP_SECRET;
const expectedDatabase = process.env.DR250_ADMIN_BOOTSTRAP_DATABASE_NAME;

if (process.env.NODE_ENV !== 'production' || !process.env.DATABASE_URL
  || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')
  || !fullName || fullName.length > 120
  || !password || password.length < 16 || password.length > 128
  || !/^[A-Za-z0-9_-]{43,}$/.test(secret ?? '') || !expectedDatabase) {
  throw new Error('Production mode, database URL and expected database name, Admin email/name, 16+ character password, and a random 43+ character bootstrap secret are required.');
}

const secretHash = createHash('sha256').update(secret).digest('hex');
const passwordHash = await hashPassword(password);
try {
  await withTransaction(async (transaction) => {
    await transaction.query('SELECT pg_advisory_xact_lock(250023)');
    const identity = await transaction.query('SELECT current_database() AS name');
    if (identity.rows[0]?.name !== expectedDatabase) throw new Error('Database identity mismatch.');
    const used = await transaction.query('SELECT id FROM private.admin_bootstrap WHERE id = true');
    if (used.rowCount) throw new Error('Production Admin bootstrap has already been used.');
    const admins = await transaction.query("SELECT 1 FROM public.profiles WHERE role = 'ADMIN' LIMIT 1");
    if (admins.rowCount) throw new Error('An Admin already exists; use a reviewed recovery process.');

    const userId = randomUUID();
    await transaction.query('INSERT INTO public.users (id, email) VALUES ($1, $2)', [userId, email]);
    await transaction.query('INSERT INTO private.account_credentials (user_id, password_hash) VALUES ($1, $2)', [userId, passwordHash]);
    await transaction.query("INSERT INTO public.profiles (user_id, full_name, role) VALUES ($1, $2, 'ADMIN')", [userId, fullName]);
    await transaction.query('INSERT INTO private.admin_bootstrap (secret_hash, admin_user_id) VALUES ($1, $2)', [secretHash, userId]);
    await transaction.query(`INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      VALUES ($1, 'ADMIN_BOOTSTRAPPED', 'USER', $1, '{}'::jsonb)`, [userId]);
  });
  console.log('Production Admin created; bootstrap permanently consumed.');
} finally {
  await closeDatabase();
}
