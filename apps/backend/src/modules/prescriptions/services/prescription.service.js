import { logProviderRead } from '../../sessions/services/audit.service.js';
import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';
import { getVerifiedDoctor } from '../../doctors/services/doctor.service.js';
import { authorizePatientDataAccess } from '../../sessions/services/access.service.js';

export async function getPatientPrescriptions(user, patientId, database = pool) {
  await authorizePatientDataAccess(user, patientId, database);
  const result = await query(
    `
      SELECT prescription.id, prescription.patient_id, prescription.doctor_id,
             prescription.medicine, prescription.dosage, prescription.duration,
             prescription.instructions, prescription.created_at, prescription.updated_at,
             profile.full_name AS doctor_name, doctor.specialization
      FROM public.prescriptions AS prescription
      INNER JOIN public.doctors AS doctor ON doctor.id = prescription.doctor_id
      INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
      WHERE prescription.patient_id = $1
      ORDER BY prescription.created_at DESC
    `,
    [patientId],
    database,
  );
  await logProviderRead(user, patientId, 'PRESCRIPTIONS_READ', database);
  return result.rows;
}

export async function createDoctorPrescription(user, prescription, database = pool, suppliedDoctor) {
  const doctor = suppliedDoctor ?? await getVerifiedDoctor(user.id, database);
  if (doctor.verification_status !== 'VERIFIED') {
    throw new HttpError(403, 'A verified doctor profile is required.', { code: 'DOCTOR_NOT_VERIFIED' });
  }

  const result = await query(
    `
      WITH authorized AS (
        SELECT session.id
        FROM public.access_sessions AS session
        JOIN public.doctors AS verified_doctor ON verified_doctor.id = session.doctor_id
        JOIN public.profiles AS profile ON profile.id = verified_doctor.profile_id
        WHERE session.patient_id = $1 AND session.doctor_id = $2
          AND profile.user_id = $7 AND verified_doctor.verification_status = 'VERIFIED'
          AND session.status = 'ACTIVE' AND session.revoked_at IS NULL
          AND session.expires_at > now()
        LIMIT 1 FOR SHARE OF session, verified_doctor
      )
      INSERT INTO public.prescriptions
        (patient_id, doctor_id, medicine, dosage, duration, instructions)
      SELECT $1, $2, $3, $4, $5, $6 FROM authorized
      RETURNING id, patient_id, doctor_id, medicine, dosage, duration,
                instructions, created_at, updated_at
    `,
    [
      prescription.patientId,
      doctor.id,
      prescription.medicine,
      prescription.dosage,
      prescription.duration ?? null,
      prescription.instructions,
      user.id,
    ],
    database,
  );

  if (!result.rows[0]) {
    throw new HttpError(403, 'An active patient access session is required.', {
      code: 'PATIENT_ACCESS_DENIED',
    });
  }
  return result.rows[0];
}
