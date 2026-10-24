import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { pool, query } from '../../../database/pool.js';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SESSION_SECONDS = 24 * 60 * 60;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const parts = stored?.split(':');
  if (parts?.length !== 3 || parts[0] !== 'scrypt'
    || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{128}$/.test(parts[2])) return false;
  const expected = Buffer.from(parts[2], 'hex');
  const actual = await scrypt(password, Buffer.from(parts[1], 'hex'), KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

export function isLocalToken(token) {
  return typeof token === 'string' && /^dr250_[A-Za-z0-9_-]{43}$/.test(token);
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createLocalSession(userId, database = pool) {
  const accessToken = `dr250_${randomBytes(32).toString('base64url')}`;
  await query(`INSERT INTO private.auth_sessions (token_hash, user_id, expires_at)
    VALUES ($1, $2, now() + ($3 * interval '1 second'))`,
  [tokenHash(accessToken), userId, SESSION_SECONDS], database);
  return { accessToken, expiresIn: SESSION_SECONDS };
}

export async function findLocalSessionUser(token, database = pool) {
  if (!isLocalToken(token)) return null;
  const result = await query(`SELECT user_id FROM private.auth_sessions
    WHERE token_hash = $1 AND expires_at > now()`, [tokenHash(token)], database);
  return result.rows[0]?.user_id ?? null;
}

export async function revokeLocalSession(token, database = pool) {
  await query('DELETE FROM private.auth_sessions WHERE token_hash = $1', [tokenHash(token)], database);
}
