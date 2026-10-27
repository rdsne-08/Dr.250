import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

const PATIENT_PROFILE_SELECT = `
  SELECT
    patient.id,
    patient.date_of_birth,
    patient.gender,
    patient.blood_group,
    patient.emergency_contact,
    patient.country_code,
    patient.created_at,
    patient.updated_at,
    profile.full_name,
    profile.phone,
    profile.role,
    app_user.email
  FROM public.patients AS patient
  INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
  INNER JOIN public.users AS app_user ON app_user.id = profile.user_id
`;

export async function findPatientByUserId(userId, database = pool) {
  const result = await query(
    `${PATIENT_PROFILE_SELECT} WHERE profile.user_id = $1 LIMIT 1`,
    [userId],
    database,
  );
  return result.rows[0] ?? null;
}

export async function getPatientProfile(userId, database = pool) {
  const patient = await findPatientByUserId(userId, database);
  if (!patient) {
    throw new HttpError(404, 'Patient profile not found.', { code: 'PATIENT_NOT_FOUND' });
  }
  return patient;
}

export async function updatePatientCountry(userId, countryCode, database = pool) {
  const result = await query(`UPDATE public.patients AS patient SET country_code=$2
    FROM public.profiles AS profile
    WHERE patient.profile_id=profile.id AND profile.user_id=$1 AND profile.role='PATIENT'
    RETURNING patient.id`, [userId, countryCode], database);
  if (!result.rows[0]) throw new HttpError(404, 'Patient profile not found.');
  return getPatientProfile(userId, database);
}

export async function assertPatientOwnership(userId, patientId, database = pool) {
  const patient = await findPatientByUserId(userId, database);

  if (!patient || patient.id !== patientId) {
    throw new HttpError(403, 'You can only access your own patient information.', {
      code: 'PATIENT_ACCESS_DENIED',
    });
  }

  return patient;
}

export async function getOwnMedicalRecords(userId, database = pool) {
  const result = await query(
    `
      SELECT record.id, record.patient_id, record.title, record.description,
             record.document_url, record.record_type, record.created_at, record.updated_at
      FROM public.medical_records AS record
      INNER JOIN public.patients AS patient ON patient.id = record.patient_id
      INNER JOIN public.profiles AS profile ON profile.id = patient.profile_id
      WHERE profile.user_id = $1
      ORDER BY record.created_at DESC
    `,
    [userId],
    database,
  );
  return result.rows;
}

export async function getOwnPrescriptions(userId, database = pool) {
  const result = await query(
    `
      SELECT prescription.id, prescription.patient_id, prescription.doctor_id,
             prescription.medicine, prescription.dosage, prescription.duration,
             prescription.instructions, prescription.created_at, prescription.updated_at,
             doctor_profile.full_name AS doctor_name, doctor.specialization
      FROM public.prescriptions AS prescription
      INNER JOIN public.patients AS patient ON patient.id = prescription.patient_id
      INNER JOIN public.profiles AS patient_profile ON patient_profile.id = patient.profile_id
      INNER JOIN public.doctors AS doctor ON doctor.id = prescription.doctor_id
      INNER JOIN public.profiles AS doctor_profile ON doctor_profile.id = doctor.profile_id
      WHERE patient_profile.user_id = $1
      ORDER BY prescription.created_at DESC
    `,
    [userId],
    database,
  );
  return result.rows;
}
