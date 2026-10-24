import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

const DOCTOR_PROFILE_SELECT = `
  SELECT
    doctor.id,
    doctor.specialization,
    doctor.license_number,
    doctor.verification_status,
    doctor.created_at,
    doctor.updated_at,
    profile.full_name,
    profile.phone,
    profile.role,
    app_user.email
  FROM public.doctors AS doctor
  INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
  INNER JOIN public.users AS app_user ON app_user.id = profile.user_id
`;

export async function findDoctorByUserId(userId, database = pool) {
  const result = await query(
    `${DOCTOR_PROFILE_SELECT} WHERE profile.user_id = $1 LIMIT 1`,
    [userId],
    database,
  );
  return result.rows[0] ?? null;
}

export async function getVerifiedDoctor(userId, database = pool) {
  const doctor = await findDoctorByUserId(userId, database);

  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found.', { code: 'DOCTOR_NOT_FOUND' });
  }

  if (doctor.verification_status !== 'VERIFIED') {
    throw new HttpError(403, 'A verified doctor profile is required.', {
      code: 'DOCTOR_NOT_VERIFIED',
    });
  }

  return doctor;
}

export async function getAuthorizedPatients(doctorId, database = pool) {
  const result = await query(
    `
      SELECT DISTINCT ON (patient.id)
             patient.id, patient.date_of_birth, patient.gender, patient.blood_group,
             profile.full_name, profile.phone, app_user.email,
             session.expires_at AS access_expires_at,
             session.last_accessed_at
      FROM public.access_sessions AS session
      INNER JOIN public.patients AS patient ON patient.id = session.patient_id
      INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
      INNER JOIN public.users AS app_user ON app_user.id = profile.user_id
      WHERE session.doctor_id = $1
        AND session.status = 'ACTIVE' AND session.revoked_at IS NULL
        AND session.expires_at > now()
      ORDER BY patient.id, session.expires_at DESC
    `,
    [doctorId],
    database,
  );
  return result.rows;
}

export async function getAvailableLaboratories(database = pool) {
  const result = await query(
    `
      SELECT laboratory.id, laboratory.lab_name, laboratory.license_number,
             profile.full_name, app_user.email
      FROM public.laboratories AS laboratory
      INNER JOIN public.profiles AS profile ON profile.id = laboratory.profile_id
      INNER JOIN public.users AS app_user ON app_user.id = profile.user_id
      WHERE laboratory.verification_status = 'VERIFIED'
      ORDER BY laboratory.lab_name
    `,
    [],
    database,
  );
  return result.rows;
}

export async function hasActivePatientAccess(doctorId, patientId, database = pool) {
  const result = await query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM public.access_sessions
        WHERE doctor_id = $1
          AND patient_id = $2
          AND status = 'ACTIVE' AND revoked_at IS NULL
          AND expires_at > now()
      ) AS authorized
    `,
    [doctorId, patientId],
    database,
  );
  return result.rows[0]?.authorized === true;
}

export async function assertDoctorPatientAccess(doctor, patientId, database = pool) {
  if (doctor.verification_status !== 'VERIFIED') {
    throw new HttpError(403, 'A verified doctor profile is required.', {
      code: 'DOCTOR_NOT_VERIFIED',
    });
  }

  if (!(await hasActivePatientAccess(doctor.id, patientId, database))) {
    throw new HttpError(403, 'An active patient access session is required.', {
      code: 'PATIENT_ACCESS_DENIED',
    });
  }
}
