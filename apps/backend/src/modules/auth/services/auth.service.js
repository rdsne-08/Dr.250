import { supabaseAdmin, supabaseAuth } from '../../../config/supabase.js';
import { HttpError } from '../../../middleware/http-error.js';
import { createProfile, findProfileByUserId } from './profile.service.js';

function registrationError(error) {
  if (error?.code === 'email_exists' || error?.code === 'user_already_exists') {
    return new HttpError(409, 'An account with this email already exists.');
  }

  if (error?.status === 429) {
    return new HttpError(429, 'Too many registration attempts. Please try again later.');
  }

  if (Number.isInteger(error?.status) && error.status < 500) {
    return new HttpError(400, 'The account details were rejected.');
  }

  return new HttpError(502, 'Unable to create the authentication account.');
}

function loginError(error) {
  if (error?.status === 429) {
    return new HttpError(429, 'Too many login attempts. Please try again later.');
  }

  if (!Number.isInteger(error?.status) || error.status >= 500) {
    return new HttpError(503, 'The authentication service is temporarily unavailable.');
  }

  return new HttpError(401, 'Invalid email or password.');
}

export async function registerUser({ email, password, fullName, role }) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data?.user) {
    throw registrationError(error);
  }

  try {
    return await createProfile({
      userId: data.user.id,
      email: data.user.email ?? email,
      fullName,
      role,
    });
  } catch (error) {
    // Supabase and PostgreSQL cannot share one transaction. Remove the newly
    // created Auth user if local profile creation fails to prevent an orphan.
    try {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);

      if (cleanupError) {
        console.error('Failed to remove an orphaned Supabase Auth user.', {
          userId: data.user.id,
          message: cleanupError.message,
        });
      }
    } catch (cleanupError) {
      console.error('Failed to remove an orphaned Supabase Auth user.', {
        userId: data.user.id,
        message: cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error',
      });
    }

    if (error?.code === '23505') {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
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
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, 'local');

  if (error) {
    throw new HttpError(401, 'The session is invalid or already expired.');
  }
}
