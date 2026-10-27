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
             prescription.instructions, prescription.appointment_id,
             prescription.created_at, prescription.updated_at,
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

  let result;
  try { result = await query(
    `
      WITH authorized AS (
        SELECT appointment.id AS appointment_id
        FROM public.appointments AS appointment
        JOIN public.access_sessions AS session ON session.appointment_id=appointment.id
        JOIN public.doctors AS verified_doctor ON verified_doctor.id=appointment.doctor_id
        JOIN public.profiles AS profile ON profile.id=verified_doctor.profile_id
        WHERE appointment.patient_id=$1 AND appointment.doctor_id=$2
          AND appointment.status='BOOKED' AND appointment.consultation_status='ACTIVE'
          AND profile.user_id=$7 AND verified_doctor.verification_status='VERIFIED'
          AND session.patient_id=$1 AND session.doctor_id=$2
          AND session.status='ACTIVE' AND session.revoked_at IS NULL
          AND session.expires_at > now()
        LIMIT 1 FOR SHARE OF appointment, session, verified_doctor
      ), saved AS (
        INSERT INTO public.prescriptions
          (patient_id, doctor_id, medicine, dosage, duration, instructions, appointment_id)
        SELECT $1, $2, $3, $4, $5, $6, appointment_id FROM authorized
        RETURNING id, patient_id, doctor_id, medicine, dosage, duration,
                  instructions, appointment_id, created_at, updated_at
      ), audited AS (
        INSERT INTO public.audit_logs (user_id,action,entity_type,entity_id,metadata)
        SELECT $7,'PRESCRIPTION_CREATED','PATIENT_ACCESS',$1,
          jsonb_build_object('prescription_id',saved.id::text,'appointment_id',saved.appointment_id::text)
        FROM saved RETURNING id
      )
      SELECT * FROM saved
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
  ); } catch (error) {
    if (error.code === '23505' && error.cause?.constraint === 'prescriptions_visit_line_unique') {
      throw new HttpError(409, 'This prescription was already saved for the visit.');
    }
    throw error;
  }

  if (!result.rows[0]) {
    throw new HttpError(403, 'An active consultation with patient consent is required.', {
      code: 'PATIENT_ACCESS_DENIED',
    });
  }
  return result.rows[0];
}
