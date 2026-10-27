import { pool, query, withTransaction } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

const DOCTOR_PROFILE_SELECT = `
  SELECT
    doctor.id,
    doctor.specialization,
    doctor.license_number,
    doctor.verification_status,
    doctor.created_at,
    doctor.updated_at,
    doctor.qualifications,
    doctor.years_experience,
    doctor.biography,
    doctor.chamber_name,
    doctor.chamber_address,
    doctor.city,
    doctor.practice_country,
    doctor.practice_timezone,
    to_char(doctor.consultation_start, 'HH24:MI') AS consultation_start,
    to_char(doctor.consultation_end, 'HH24:MI') AS consultation_end,
    doctor.consultation_fee::text AS consultation_fee,
    doctor.consultation_currency,
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

export async function updateProfessionalProfile(userId, details, database = pool) {
  await withTransaction(async transaction => {
    const owner = await transaction.query(`UPDATE public.profiles
      SET full_name=$2 WHERE user_id=$1 AND role='DOCTOR' RETURNING id`,
    [userId, details.fullName]);
    if (!owner.rows[0]) throw new HttpError(404, 'Doctor profile not found.');
    await transaction.query(`UPDATE public.doctors SET
      specialization=$2, qualifications=$3, years_experience=$4, biography=$5,
      chamber_name=$6, chamber_address=$7, city=$8, practice_country=$9,
      practice_timezone=$10, consultation_start=$11, consultation_end=$12,
      consultation_fee=$13, consultation_currency=$14
      WHERE profile_id=$1`, [owner.rows[0].id, details.specialization,
      details.qualifications, details.yearsExperience, details.biography,
      details.chamberName, details.chamberAddress, details.city,
      details.practiceCountry, details.practiceTimezone, details.consultationStart,
      details.consultationEnd, details.consultationFee, details.consultationCurrency]);
    await transaction.query(`INSERT INTO public.audit_logs
      (user_id, action, entity_type, entity_id, metadata)
      SELECT $1, 'DOCTOR_PROFILE_UPDATED', 'DOCTOR', doctor.id, '{}'::jsonb
      FROM public.doctors AS doctor WHERE doctor.profile_id=$2`, [userId, owner.rows[0].id]);
  }, database);
  return findDoctorByUserId(userId, database);
}

export function localDateForTimezone(timezone, at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const value = name => parts.find(part => part.type === name).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function profileReady(doctor) {
  return ['qualifications', 'years_experience', 'biography', 'chamber_name',
    'chamber_address', 'city', 'practice_country', 'practice_timezone',
    'consultation_start', 'consultation_end', 'consultation_fee',
    'consultation_currency'].every(field => doctor[field] !== null && doctor[field] !== undefined
      && doctor[field] !== '');
}

export async function getTodayAvailability(userId, database = pool, at = new Date()) {
  const doctor = await findDoctorByUserId(userId, database);
  if (!doctor) throw new HttpError(404, 'Doctor profile not found.');
  if (!doctor.practice_timezone) return { local_date: null, practice_timezone: null, configured: false,
    available: false, max_patients: null, consultation_start: null, consultation_end: null };
  const localDate = localDateForTimezone(doctor.practice_timezone, at);
  const result = await query(`SELECT doctor_id, local_date::text AS local_date, practice_timezone,
      available, max_patients, to_char(consultation_start,'HH24:MI') AS consultation_start,
      to_char(consultation_end,'HH24:MI') AS consultation_end, updated_at
    FROM public.doctor_daily_availability
    WHERE doctor_id=$1 AND local_date=$2 AND practice_timezone=$3`,
  [doctor.id, localDate, doctor.practice_timezone], database);
  return result.rows[0] ? { ...result.rows[0], configured: true } : {
    local_date: localDate, practice_timezone: doctor.practice_timezone,
    configured: false, available: false, max_patients: null,
    consultation_start: null, consultation_end: null,
  };
}

export async function saveTodayAvailability(userId, details, database = pool, at = new Date()) {
  return withTransaction(async transaction => {
    const doctor = (await transaction.query(`${DOCTOR_PROFILE_SELECT}
      WHERE profile.user_id=$1 FOR SHARE OF doctor`, [userId])).rows[0];
    if (!doctor) throw new HttpError(404, 'Doctor profile not found.');
    if (details.available && doctor.verification_status !== 'VERIFIED') {
      throw new HttpError(403, 'Only verified doctors can be available today.', { code: 'DOCTOR_NOT_VERIFIED' });
    }
    if (!doctor.practice_timezone) {
      throw new HttpError(400, 'Save a practice time zone in your professional profile first.');
    }
    if (details.available && !profileReady(doctor)) {
      throw new HttpError(400, 'Complete your professional profile before enabling availability.');
    }
    const localDate = localDateForTimezone(doctor.practice_timezone, at);
    if (details.localDate && details.localDate !== localDate) {
      throw new HttpError(409, 'The chamber date changed. Refresh today’s availability before saving.',
        { code: 'AVAILABILITY_DATE_CHANGED' });
    }
    const result = await transaction.query(`INSERT INTO public.doctor_daily_availability
      (doctor_id, local_date, practice_timezone, available, max_patients, consultation_start, consultation_end)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (doctor_id, local_date) DO UPDATE SET
        practice_timezone=EXCLUDED.practice_timezone, available=EXCLUDED.available,
        max_patients=EXCLUDED.max_patients, consultation_start=EXCLUDED.consultation_start,
        consultation_end=EXCLUDED.consultation_end
      RETURNING doctor_id, local_date::text AS local_date, practice_timezone, available,
        max_patients, to_char(consultation_start,'HH24:MI') AS consultation_start,
        to_char(consultation_end,'HH24:MI') AS consultation_end, updated_at`,
    [doctor.id, localDate, doctor.practice_timezone, details.available,
      details.maxPatients, details.consultationStart, details.consultationEnd]);
    const activeBookings = (await transaction.query(`SELECT count(*)::int AS total
        FROM public.appointments WHERE doctor_id=$1 AND local_date=$2 AND status='BOOKED'`,
    [doctor.id, localDate])).rows[0].total;
    if (details.maxPatients < activeBookings) {
      throw new HttpError(409, 'Daily capacity cannot be lower than active appointments.');
    }
    await transaction.query(`INSERT INTO public.audit_logs
      (user_id, action, entity_type, entity_id, metadata)
      VALUES ($1,'DOCTOR_AVAILABILITY_UPDATED','DOCTOR',$2,$3::jsonb)`,
    [userId, doctor.id, JSON.stringify({ local_date: localDate, available: details.available })]);
    return { ...result.rows[0], configured: true };
  }, database);
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
