import pg from 'pg';

import { env } from '../config/environment.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error.', error);
});

export class DatabaseError extends Error {
  constructor(error) {
    super('A database operation failed.', { cause: error });
    this.name = 'DatabaseError';
    this.code = error?.code;
  }
}

function asDatabaseError(error) {
  if (error instanceof DatabaseError || Number.isInteger(error?.statusCode)) {
    return error;
  }

  return new DatabaseError(error);
}

export async function query(text, values = [], database = pool) {
  try {
    return await database.query(text, values);
  } catch (error) {
    throw asDatabaseError(error);
  }
}

export async function withTransaction(work, database = pool) {
  let client;

  try {
    client = await database.connect();
  } catch (error) {
    throw asDatabaseError(error);
  }

  try {
    await client.query('BEGIN');
    const result = await work({
      query: (text, values = []) => query(text, values, client),
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to roll back PostgreSQL transaction.', rollbackError);
    }

    throw asDatabaseError(error);
  } finally {
    client.release();
  }
}

export async function testDatabaseConnection(database = pool) {
  const result = await query('SELECT 1 AS connected', [], database);
  return result.rows[0]?.connected === 1;
}

export async function closeDatabase() {
  await pool.end();
}
