import { pool } from '../../../database/pool.js';

const PROFILE_SELECT = `
  SELECT
    p.id AS profile_id,
    p.user_id,
    u.email,
    p.full_name,
    p.phone,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles AS p
  INNER JOIN public.users AS u ON u.id = p.user_id
`;

export async function findProfileByUserId(userId, database = pool) {
  const result = await database.query(
    `${PROFILE_SELECT} WHERE p.user_id = $1 LIMIT 1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function createProfile({ userId, email, fullName, role }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO public.users (id, email) VALUES ($1, $2)`,
      [userId, email],
    );

    const result = await client.query(
      `
        INSERT INTO public.profiles (user_id, full_name, role)
        VALUES ($1, $2, $3)
        RETURNING id AS profile_id, user_id, full_name, phone, role, created_at, updated_at
      `,
      [userId, fullName, role],
    );

    await client.query('COMMIT');

    return {
      ...result.rows[0],
      email,
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to roll back profile creation.', rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
}
