import { createHash, randomBytes } from 'node:crypto';

import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

export async function getDoctorSessions(doctorId, database = pool) {
  const result = await query(
    `
      SELECT session.id, session.patient_id, session.expires_at, session.revoked_at,
             session.status, session.redeemed_at, session.last_accessed_at, session.created_at, session.updated_at,
             profile.full_name AS patient_name
      FROM public.access_sessions AS session
      INNER JOIN public.patients AS patient ON patient.id = session.patient_id
      INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
      WHERE session.doctor_id = $1 AND session.status = 'ACTIVE'
      ORDER BY session.created_at DESC
    `,
    [doctorId],
    database,
  );
  return result.rows;
}

export async function getPatientSessions(patientId, database = pool) {
  const result = await query(
    `
      SELECT session.id, session.doctor_id, session.expires_at, session.revoked_at,
             session.status, session.redeemed_at, session.last_accessed_at, session.created_at, session.updated_at,
             profile.full_name AS doctor_name, doctor.specialization
      FROM public.access_sessions AS session
      INNER JOIN public.doctors AS doctor ON doctor.id = session.doctor_id
      INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
      WHERE session.patient_id = $1
      ORDER BY session.created_at DESC
    `,
    [patientId],
    database,
  );
  return result.rows;
}

export async function createPatientSession({ patientId, doctorId, expiresAt }, database = pool) {
  const plaintextToken = randomBytes(24).toString('base64url');
  const tokenDigest = createHash('sha256').update(plaintextToken).digest('hex');
  const result = await query(
    `
      INSERT INTO public.access_sessions (patient_id, doctor_id, access_token, expires_at)
      SELECT $1, doctor.id, $3, $4
      FROM public.doctors AS doctor
      WHERE doctor.id = $2 AND doctor.verification_status = 'VERIFIED'
      RETURNING id, patient_id, doctor_id, expires_at, created_at, status
    `,
    [patientId, doctorId, tokenDigest, expiresAt],
    database,
  );

  if (!result.rows[0]) {
    throw new HttpError(400, 'The selected doctor is unavailable or not verified.', {
      code: 'INVALID_DOCTOR',
    });
  }

  return { ...result.rows[0], access_token: plaintextToken };
}

export async function revokePatientSession(sessionId, patientId, database = pool) {
  const result = await query(
    `
      UPDATE public.access_sessions
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE id = $1 AND patient_id = $2
      RETURNING id, patient_id, doctor_id, expires_at, revoked_at
    `,
    [sessionId, patientId],
    database,
  );

  if (!result.rows[0]) {
    throw new HttpError(404, 'Access session not found.', { code: 'SESSION_NOT_FOUND' });
  }

  return result.rows[0];
}

export async function getVerifiedDoctors(database = pool) {
  return (await query(`SELECT doctor.id, profile.full_name, doctor.specialization,
    doctor.license_number FROM public.doctors AS doctor
    JOIN public.profiles AS profile ON profile.id = doctor.profile_id
    WHERE doctor.verification_status = 'VERIFIED' ORDER BY profile.full_name`, [], database)).rows;
}

// Database-backed budget shared by all API workers. Count before validation so
// malformed and incorrect credentials consume the same authenticated-user budget.
export async function consumeRedemptionAttempt(userId, database = pool) {
  const result = await query(`INSERT INTO private.session_redemption_limits AS limits
      (user_id, window_start, attempts) VALUES ($1, clock_timestamp(), 1)
    ON CONFLICT (user_id) DO UPDATE SET
      attempts = CASE WHEN limits.window_start <= clock_timestamp() - interval '1 minute'
        THEN 1 ELSE limits.attempts + 1 END,
      window_start = CASE WHEN limits.window_start <= clock_timestamp() - interval '1 minute'
        THEN clock_timestamp() ELSE limits.window_start END
    RETURNING attempts`, [userId], database);
  if (result.rows[0].attempts > 5) {
    throw new HttpError(429, 'Too many attempts. Wait one minute before retrying.', { code: 'PIN_RATE_LIMITED' });
  }
}

export async function redeemPatientSession(user, credential, database = pool) {
  if (user.role !== 'DOCTOR') throw new HttpError(403, 'Doctor access required.', { code: 'FORBIDDEN' });
  await consumeRedemptionAttempt(user.id, database);
  if (typeof credential !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(credential)) {
    throw new HttpError(400, 'Invalid credential or doctor binding.', { code: 'PIN_INVALID' });
  }
  const digest = createHash('sha256').update(credential).digest('hex');
  // PostgreSQL rechecks the predicate after waiting on a concurrent row update.
  // Only the winner can change PENDING to ACTIVE; no read-then-write race.
  const result = await query(`UPDATE public.access_sessions AS session
    SET status = 'ACTIVE', redeemed_at = clock_timestamp()
    FROM public.doctors AS doctor JOIN public.profiles AS profile ON profile.id = doctor.profile_id
    WHERE session.access_token = $1 AND session.doctor_id = doctor.id
      AND profile.user_id = $2 AND doctor.verification_status = 'VERIFIED'
      AND session.status = 'PENDING' AND session.revoked_at IS NULL
      AND session.expires_at > clock_timestamp()
    RETURNING session.id, session.patient_id, session.doctor_id, session.status,
      session.expires_at, session.redeemed_at`, [digest, user.id], database);
  if (result.rows[0]) return result.rows[0];
  // Reveal lifecycle errors only to the bound, currently verified doctor.
  const state = (await query(`SELECT session.status, session.revoked_at,
      session.expires_at <= clock_timestamp() AS expired
    FROM public.access_sessions AS session
    JOIN public.doctors AS doctor ON doctor.id = session.doctor_id
    JOIN public.profiles AS profile ON profile.id = doctor.profile_id
    WHERE session.access_token = $1 AND profile.user_id = $2
      AND doctor.verification_status = 'VERIFIED'`, [digest, user.id], database)).rows[0];
  if (state?.revoked_at) throw new HttpError(410, 'This session was revoked.', { code: 'PIN_REVOKED' });
  if (state?.status === 'ACTIVE') throw new HttpError(409, 'This credential has already been used.', { code: 'PIN_ALREADY_USED' });
  if (state?.expired) throw new HttpError(410, 'This credential has expired.', { code: 'PIN_EXPIRED' });
  throw new HttpError(400, 'Invalid credential or doctor binding.', { code: 'PIN_INVALID' });
}
