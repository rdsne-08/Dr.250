import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';
import { assertDoctorPatientAccess, getVerifiedDoctor } from '../../doctors/services/doctor.service.js';
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
  return result.rows;
}

export async function createDoctorPrescription(user, prescription, database = pool, suppliedDoctor) {
  const doctor = suppliedDoctor ?? await getVerifiedDoctor(user.id, database);
  await assertDoctorPatientAccess(doctor, prescription.patientId, database);

  const result = await query(
    `
      INSERT INTO public.prescriptions
        (patient_id, doctor_id, medicine, dosage, duration, instructions)
      VALUES ($1, $2, $3, $4, $5, $6)
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
    ],
    database,
  );

  if (!result.rows[0]) {
    throw new HttpError(500, 'The prescription could not be created.');
  }
  return result.rows[0];
}
