import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

export async function authorizePatientDataAccess(user, patientId, database = pool) {
  if (user.role === 'PATIENT') {
    const result = await query(
      `
        SELECT patient.id
        FROM public.patients AS patient
        INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
        WHERE profile.user_id = $1 AND patient.id = $2
        LIMIT 1
      `,
      [user.id, patientId],
      database,
    );

    if (!result.rows[0]) {
      throw new HttpError(403, 'You can only access your own patient information.', {
        code: 'PATIENT_ACCESS_DENIED',
      });
    }

    return { role: 'PATIENT', patientId: result.rows[0].id };
  }

  if (user.role === 'DOCTOR') {
    const result = await query(
      `
        SELECT doctor.id,
               doctor.verification_status,
               EXISTS (
                 SELECT 1
                 FROM public.access_sessions AS session
                 WHERE session.doctor_id = doctor.id
                   AND session.patient_id = $2
                   AND session.status = 'ACTIVE' AND session.revoked_at IS NULL
                   AND session.expires_at > now()
               ) AS authorized
        FROM public.doctors AS doctor
        INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
        WHERE profile.user_id = $1
        LIMIT 1
      `,
      [user.id, patientId],
      database,
    );
    const doctor = result.rows[0];

    if (!doctor || doctor.verification_status !== 'VERIFIED') {
      throw new HttpError(403, 'A verified doctor profile is required.', {
        code: 'DOCTOR_NOT_VERIFIED',
      });
    }

    if (!doctor.authorized) {
      throw new HttpError(403, 'An active patient access session is required.', {
        code: 'PATIENT_ACCESS_DENIED',
      });
    }

    return { role: 'DOCTOR', doctorId: doctor.id };
  }

  throw new HttpError(403, 'You do not have permission to access this patient.', {
    code: 'PATIENT_ACCESS_DENIED',
  });
}
