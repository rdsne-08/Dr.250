import { randomUUID } from 'node:crypto';

import { supabaseAdmin, supabaseAuth } from '../../../config/supabase.js';
import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';
import { createLocalSession, hashPassword, isLocalToken, revokeLocalSession, verifyPassword } from './local-auth.service.js';
import { createProfile, findProfileByUserId } from './profile.service.js';

function loginError(error) {
  if (error?.status === 429) {
    return new HttpError(429, 'Too many login attempts. Please try again later.');
  }

  if (!Number.isInteger(error?.status) || error.status >= 500) {
    return new HttpError(503, 'The authentication service is temporarily unavailable.');
  }

  return new HttpError(401, 'Invalid email or password.');
}

export async function registerUser({
  email,
  password,
  fullName,
  role,
  specialization,
  labName,
  licenseNumber,
}) {
  try {
    return await createProfile({
      userId: randomUUID(),
      email,
      fullName,
      role,
      specialization,
      labName,
      licenseNumber,
      passwordHash: await hashPassword(password),
    });
  } catch (error) {
    if (error?.code === '23505') {
      throw new HttpError(409, 'An account with this email already exists.');
    }
    console.error('Registration persistence failed.', { code: error?.code ?? 'UNKNOWN' });
    throw new HttpError(503, 'Account creation is temporarily unavailable. Please try again later.');
  }
}

export async function loginUser({ email, password }) {
  let account;
  try {
    account = (await query(`SELECT users.id, credentials.password_hash
      FROM public.users AS users
      LEFT JOIN private.account_credentials AS credentials ON credentials.user_id = users.id
      WHERE lower(users.email) = $1`,
      [email])).rows[0];
  } catch {
    throw new HttpError(503, 'Sign-in is temporarily unavailable. Please try again later.');
  }
  if (!account) throw new HttpError(401, 'Invalid email or password.');
  if (account.password_hash) {
    if (!(await verifyPassword(password, account.password_hash))) {
      throw new HttpError(401, 'Invalid email or password.');
    }
    let profile;
    try {
      profile = await findProfileByUserId(account.id);
    } catch {
      throw new HttpError(503, 'Sign-in is temporarily unavailable. Please try again later.');
    }
    if (!profile) throw new HttpError(403, 'A profile is not available for this account.');
    let session;
    try {
      session = await createLocalSession(account.id);
    } catch {
      throw new HttpError(503, 'Sign-in is temporarily unavailable. Please try again later.');
    }
    return { ...session, refreshToken: null, tokenType: 'bearer', profile };
  }

  // Accounts created before local authentication retain their Supabase path.
  if (!supabaseAuth || !supabaseAdmin) {
    throw new HttpError(503, 'Legacy sign-in is temporarily unavailable.');
  }
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error) {
    throw loginError(error);
  }

  if (!data?.user || !data.session) {
    throw new HttpError(503, 'The authentication service returned an incomplete response.');
  }

  const profile = await findProfileByUserId(data.user.id);

  if (!profile) {
    await supabaseAdmin.auth.admin.signOut(data.session.access_token, 'local');
    throw new HttpError(403, 'A profile is not available for this account.');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    tokenType: data.session.token_type,
    profile,
  };
}

export async function logoutUser(accessToken) {
  if (isLocalToken(accessToken)) {
    await revokeLocalSession(accessToken);
    return;
  }
  if (!supabaseAdmin) throw new HttpError(503, 'Legacy sign-out is temporarily unavailable.');
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, 'local');

  if (error) {
    throw new HttpError(401, 'The session is invalid or already expired.');
  }
}
