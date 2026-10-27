import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';
import { authorizePatientDataAccess } from '../../sessions/services/access.service.js';
import { logProviderRead } from '../../sessions/services/audit.service.js';

export async function getHealthProfile(user, patientId, database = pool) {
  await authorizePatientDataAccess(user, patientId, database);
  const [profile, measurements] = await Promise.all([
    query(`SELECT patient_id, conditions, allergies, current_medications, medical_history,
      notes, updated_at FROM public.patient_health_profiles WHERE patient_id=$1`, [patientId], database),
    query(`SELECT id, patient_id, measured_on::text AS measured_on, systolic_mmhg,
      diastolic_mmhg, pulse_bpm, weight_kg::text AS weight_kg, created_at, updated_at
      FROM public.patient_health_measurements WHERE patient_id=$1
      ORDER BY measured_on DESC, created_at DESC`, [patientId], database),
  ]);
  await logProviderRead(user, patientId, 'HEALTH_PROFILE_READ', database,
    { type: 'HEALTH_PROFILE', id: patientId });
  return { profile: profile.rows[0] ?? null, measurements: measurements.rows };
}

export async function saveOwnHealthProfile(userId, details, database = pool) {
  const result = await query(`INSERT INTO public.patient_health_profiles
    (patient_id,conditions,allergies,current_medications,medical_history,notes)
    SELECT patient.id,$2,$3,$4,$5,$6 FROM public.patients AS patient
    JOIN public.profiles AS profile ON profile.id=patient.profile_id
    WHERE profile.user_id=$1 AND profile.role='PATIENT'
    ON CONFLICT (patient_id) DO UPDATE SET conditions=EXCLUDED.conditions,
      allergies=EXCLUDED.allergies,current_medications=EXCLUDED.current_medications,
      medical_history=EXCLUDED.medical_history,notes=EXCLUDED.notes
    RETURNING patient_id,conditions,allergies,current_medications,medical_history,notes,updated_at`,
  [userId, details.conditions, details.allergies, details.current_medications,
    details.medical_history, details.notes], database);
  if (!result.rows[0]) throw new HttpError(404, 'Patient profile not found.');
  return result.rows[0];
}

export async function addOwnMeasurement(userId, details, database = pool) {
  const result = await query(`INSERT INTO public.patient_health_measurements
    (patient_id,measured_on,systolic_mmhg,diastolic_mmhg,pulse_bpm,weight_kg)
    SELECT patient.id,$2,$3,$4,$5,$6 FROM public.patients AS patient
    JOIN public.profiles AS profile ON profile.id=patient.profile_id
    WHERE profile.user_id=$1 AND profile.role='PATIENT'
    RETURNING id,patient_id,measured_on::text AS measured_on,systolic_mmhg,
      diastolic_mmhg,pulse_bpm,weight_kg::text AS weight_kg,created_at,updated_at`,
  [userId, details.measured_on, details.systolic_mmhg, details.diastolic_mmhg,
    details.pulse_bpm, details.weight_kg], database);
  if (!result.rows[0]) throw new HttpError(404, 'Patient profile not found.');
  return result.rows[0];
}

export async function updateOwnMeasurement(userId, measurementId, details, database = pool) {
  const result = await query(`UPDATE public.patient_health_measurements AS measurement
    SET measured_on=$3,systolic_mmhg=$4,diastolic_mmhg=$5,pulse_bpm=$6,weight_kg=$7
    FROM public.patients AS patient JOIN public.profiles AS profile ON profile.id=patient.profile_id
    WHERE measurement.id=$2 AND measurement.patient_id=patient.id
      AND profile.user_id=$1 AND profile.role='PATIENT'
    RETURNING measurement.id,measurement.patient_id,measurement.measured_on::text AS measured_on,
      measurement.systolic_mmhg,measurement.diastolic_mmhg,measurement.pulse_bpm,
      measurement.weight_kg::text AS weight_kg,measurement.created_at,measurement.updated_at`,
  [userId, measurementId, details.measured_on, details.systolic_mmhg,
    details.diastolic_mmhg, details.pulse_bpm, details.weight_kg], database);
  if (!result.rows[0]) throw new HttpError(404, 'Measurement not found.');
  return result.rows[0];
}
