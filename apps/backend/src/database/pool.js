import pg from 'pg';

import { env } from '../config/environment.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error.', error);
});

export async function closeDatabase() {
  await pool.end();
}
