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
  // Keep the legacy non-null credential column populated with an unshared random digest.
  const tokenDigest = createHash('sha256').update(randomBytes(32)).digest('hex');
  const result = await query(
    `
      INSERT INTO public.access_sessions (patient_id, doctor_id, access_token, expires_at, status)
      SELECT $1, doctor.id, $3, $4, 'ACTIVE'
      FROM public.doctors AS doctor
      WHERE doctor.id = $2 AND doctor.verification_status = 'VERIFIED'
        AND NOT EXISTS (
          SELECT 1 FROM public.access_sessions AS existing
          WHERE existing.patient_id = $1 AND existing.doctor_id = $2
            AND existing.status = 'ACTIVE' AND existing.revoked_at IS NULL
            AND existing.expires_at > now()
        )
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

  return result.rows[0];
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
