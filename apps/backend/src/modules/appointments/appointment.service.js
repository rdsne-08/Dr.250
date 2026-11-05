import { pool, query, withTransaction } from '../../database/pool.js';
import { HttpError } from '../../middleware/http-error.js';
import { localDateForTimezone } from '../doctors/services/doctor.service.js';
import { COUNTRY_CODES } from '../doctors/services/practice-options.js';
import { getPatientProfile } from '../patients/services/patient.service.js';

const doctorFields = `doctor.id, profile.full_name, doctor.specialization,
  doctor.qualifications, doctor.years_experience, doctor.biography,
  doctor.chamber_name, doctor.chamber_address, doctor.city,
  doctor.practice_country, doctor.practice_timezone,
  doctor.consultation_fee::text AS consultation_fee, doctor.consultation_currency`;
const profileComplete = `profile.full_name IS NOT NULL AND btrim(profile.full_name) <> ''
  AND doctor.specialization IS NOT NULL AND btrim(doctor.specialization) <> ''
  AND doctor.qualifications IS NOT NULL AND btrim(doctor.qualifications) <> ''
  AND doctor.years_experience IS NOT NULL AND doctor.years_experience >= 0
  AND doctor.biography IS NOT NULL AND btrim(doctor.biography) <> ''
  AND doctor.chamber_name IS NOT NULL AND btrim(doctor.chamber_name) <> ''
  AND doctor.chamber_address IS NOT NULL AND btrim(doctor.chamber_address) <> ''
  AND doctor.city IS NOT NULL AND btrim(doctor.city) <> ''
  AND doctor.practice_country IS NOT NULL AND doctor.practice_timezone IS NOT NULL
  AND doctor.consultation_start IS NOT NULL AND doctor.consultation_end IS NOT NULL
  AND doctor.consultation_fee IS NOT NULL AND doctor.consultation_currency IS NOT NULL`;

export async function discoverDoctors(userId, database = pool) {
  const patient = await getPatientProfile(userId, database);
  if (!patient.country_code || !COUNTRY_CODES.has(patient.country_code.trim())) {
    return { country_code: null, doctors: [] };
  }
  const result = await query(`SELECT ${doctorFields},
      availability.local_date::text AS local_date,
      to_char(availability.consultation_start,'HH24:MI') AS consultation_start,
      to_char(availability.consultation_end,'HH24:MI') AS consultation_end,
      to_char(availability.booking_start,'HH24:MI') AS booking_start,
      to_char(availability.booking_end,'HH24:MI') AS booking_end,
      availability.max_patients,
      count(appointment.id)::int AS booked_count
    FROM public.doctors AS doctor
    JOIN public.profiles AS profile ON profile.id=doctor.profile_id
    JOIN public.doctor_daily_availability AS availability ON availability.doctor_id=doctor.id
      AND availability.practice_timezone=doctor.practice_timezone
      AND availability.local_date=(now() AT TIME ZONE doctor.practice_timezone)::date
      AND availability.available
    LEFT JOIN public.appointments AS appointment ON appointment.doctor_id=doctor.id
      AND appointment.local_date=availability.local_date AND appointment.status='BOOKED'
    WHERE doctor.verification_status='VERIFIED'
      AND doctor.practice_country=$1 AND ${profileComplete}
    GROUP BY doctor.id, profile.full_name, availability.doctor_id, availability.local_date
    ORDER BY profile.full_name, doctor.id`, [patient.country_code], database);
  return { country_code: patient.country_code.trim(), doctors: result.rows.map(row => ({
    ...row, practice_country: row.practice_country.trim(),
    consultation_currency: row.consultation_currency.trim(),
    remaining_capacity: Math.max(0, row.max_patients - row.booked_count),
  })) };
}

export async function bookAppointment(userId, doctorId, expectedDate, database = pool, at = new Date()) {
  return withTransaction(async transaction => {
    const patient = (await transaction.query(`SELECT patient.id, patient.country_code
      FROM public.patients AS patient JOIN public.profiles AS profile ON profile.id=patient.profile_id
      WHERE profile.user_id=$1 FOR UPDATE OF patient`, [userId])).rows[0];
    if (!patient) throw new HttpError(404, 'Patient profile not found.');
    if (!patient.country_code) throw new HttpError(400, 'Add your country in profile settings before booking.');
    const doctor = (await transaction.query(`SELECT ${doctorFields}, doctor.verification_status,
      doctor.consultation_start, doctor.consultation_end
      FROM public.doctors AS doctor JOIN public.profiles AS profile ON profile.id=doctor.profile_id
      WHERE doctor.id=$1 AND ${profileComplete} FOR SHARE OF doctor`, [doctorId])).rows[0];
    if (!doctor || doctor.verification_status !== 'VERIFIED') {
      throw new HttpError(404, 'Doctor is not available for booking.');
    }
    if (doctor.practice_country !== patient.country_code) {
      throw new HttpError(403, 'Appointments require the same practice country.');
    }
    const localDate = localDateForTimezone(doctor.practice_timezone, at);
    if (expectedDate && expectedDate !== localDate) {
      throw new HttpError(409, 'The chamber date changed. Refresh the doctor list.');
    }
    const availability = (await transaction.query(`SELECT * FROM public.doctor_daily_availability
      WHERE doctor_id=$1 AND local_date=$2 AND practice_timezone=$3 FOR UPDATE`,
    [doctorId, localDate, doctor.practice_timezone])).rows[0];
    if (!availability?.available) throw new HttpError(409, 'Doctor is unavailable today.');
    if (!availability.booking_start || !availability.booking_end) {
      throw new HttpError(409, 'Doctor has not configured booking hours today.');
    }
    const localTime = new Intl.DateTimeFormat('en-GB', { timeZone: doctor.practice_timezone,
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
    const start = availability.booking_start.slice(0, 5);
    const end = availability.booking_end.slice(0, 5);
    if (localTime < start || localTime >= end) {
      throw new HttpError(409, `Booking is open ${start}–${end} in the doctor's practice timezone.`);
    }
    const counts = (await transaction.query(`SELECT count(*) FILTER (WHERE status='BOOKED')::int AS active,
      coalesce(max(queue_position),0)::int AS last_position
      FROM public.appointments WHERE doctor_id=$1 AND local_date=$2`, [doctorId, localDate])).rows[0];
    if (counts.active >= availability.max_patients) {
      throw new HttpError(409, 'No booking places remain today.');
    }
    const position = counts.last_position + 1;
    const existing = await transaction.query(`SELECT id FROM public.appointments
      WHERE patient_id=$1 AND local_date=$2 AND status='BOOKED'`, [patient.id, localDate]);
    if (existing.rows[0]) throw new HttpError(409, 'You already have an appointment today.');
    const result = await transaction.query(`INSERT INTO public.appointments
      (doctor_id,patient_id,local_date,queue_position) VALUES ($1,$2,$3,$4)
      RETURNING id,doctor_id,patient_id,local_date::text AS local_date,queue_position,status,created_at`,
    [doctorId, patient.id, localDate, position]);
    return result.rows[0];
  }, database);
}

export async function cancelAppointment(userId, appointmentId, database = pool) {
  return withTransaction(async transaction => {
    const owned = (await transaction.query(`SELECT appointment.id, appointment.doctor_id,
      appointment.local_date::text AS local_date, appointment.status, appointment.consultation_status
      FROM public.appointments AS appointment
      JOIN public.patients AS patient ON patient.id=appointment.patient_id
      JOIN public.profiles AS profile ON profile.id=patient.profile_id
      WHERE appointment.id=$1 AND profile.user_id=$2 FOR UPDATE OF appointment`,
    [appointmentId, userId])).rows[0];
    if (!owned) throw new HttpError(404, 'Appointment not found.');
    if (owned.status !== 'BOOKED' || ['ACTIVE', 'COMPLETED'].includes(owned.consultation_status)) {
      throw new HttpError(409, 'An active or completed consultation cannot be cancelled.');
    }
    const result = await transaction.query(`UPDATE public.appointments
      SET status='CANCELLED', cancelled_at=now() WHERE id=$1
      RETURNING id,doctor_id,patient_id,local_date::text AS local_date,
      queue_position,status,created_at,cancelled_at`, [appointmentId]);
    return result.rows[0];
  }, database);
}

export async function patientAppointments(userId, database = pool) {
  const result = await query(`SELECT appointment.id, appointment.doctor_id,
    appointment.local_date::text AS local_date, appointment.queue_position,
    appointment.status, appointment.consultation_status,
    appointment.created_at, appointment.cancelled_at,
    profile.full_name AS doctor_name, doctor.specialization,
    doctor.chamber_name, doctor.chamber_address, doctor.city, doctor.practice_country,
    coalesce(availability.practice_timezone,doctor.practice_timezone) AS practice_timezone,
    to_char(availability.booking_start,'HH24:MI') AS booking_start,
    to_char(availability.booking_end,'HH24:MI') AS booking_end,
    to_char(availability.consultation_start,'HH24:MI') AS consultation_start,
    to_char(availability.consultation_end,'HH24:MI') AS consultation_end,
    coalesce(jsonb_agg(jsonb_build_object('id',prescription.id,'medicine',prescription.medicine,
      'dosage',prescription.dosage,'duration',prescription.duration,
      'instructions',prescription.instructions,'created_at',prescription.created_at)
      ORDER BY prescription.created_at) FILTER (WHERE prescription.id IS NOT NULL),'[]'::jsonb) AS visit_prescriptions
    FROM public.appointments AS appointment
    JOIN public.patients AS patient ON patient.id=appointment.patient_id
    JOIN public.profiles AS patient_profile ON patient_profile.id=patient.profile_id
    JOIN public.doctors AS doctor ON doctor.id=appointment.doctor_id
    JOIN public.profiles AS profile ON profile.id=doctor.profile_id
    LEFT JOIN public.doctor_daily_availability AS availability
      ON availability.doctor_id=appointment.doctor_id AND availability.local_date=appointment.local_date
    LEFT JOIN public.prescriptions AS prescription ON prescription.appointment_id=appointment.id
    WHERE patient_profile.user_id=$1
    GROUP BY appointment.id, doctor.id, profile.full_name,
      availability.doctor_id, availability.local_date
    ORDER BY appointment.local_date DESC, appointment.created_at DESC`,
  [userId], database);
  return result.rows;
}

export async function doctorTodayQueue(userId, database = pool, at = new Date()) {
  const result = await query(`SELECT doctor.id, doctor.practice_timezone
    FROM public.doctors AS doctor JOIN public.profiles AS profile ON profile.id=doctor.profile_id
    WHERE profile.user_id=$1`, [userId], database);
  const doctor = result.rows[0];
  if (!doctor) throw new HttpError(404, 'Doctor profile not found.');
  if (!doctor.practice_timezone) return { local_date: null, availability: null, appointments: [] };
  const localDate = localDateForTimezone(doctor.practice_timezone, at);
  const availability = (await query(`SELECT available, max_patients,
    to_char(booking_start,'HH24:MI') AS booking_start,
    to_char(booking_end,'HH24:MI') AS booking_end,
    to_char(consultation_start,'HH24:MI') AS consultation_start,
    to_char(consultation_end,'HH24:MI') AS consultation_end
    FROM public.doctor_daily_availability
    WHERE doctor_id=$1 AND local_date=$2 AND practice_timezone=$3`,
  [doctor.id, localDate, doctor.practice_timezone], database)).rows[0] ?? null;
  const appointments = (await query(`SELECT appointment.id, appointment.queue_position,
    appointment.status, appointment.consultation_status,
    appointment.created_at, profile.full_name AS patient_name
    FROM public.appointments AS appointment
    JOIN public.patients AS patient ON patient.id=appointment.patient_id
    JOIN public.profiles AS profile ON profile.id=patient.profile_id
    WHERE appointment.doctor_id=$1 AND appointment.local_date=$2
    ORDER BY appointment.queue_position`, [doctor.id, localDate], database)).rows;
  const activeCount = appointments.filter(item => item.status === 'BOOKED').length;
  return { local_date: localDate, practice_timezone: doctor.practice_timezone,
    availability, appointments, active_count: activeCount,
    remaining_capacity: availability ? Math.max(0, availability.max_patients - activeCount) : 0 };
}
