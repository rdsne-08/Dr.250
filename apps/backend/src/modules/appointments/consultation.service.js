import { createHash, randomBytes } from 'node:crypto';
import { pool, query, withTransaction } from '../../database/pool.js';
import { HttpError } from '../../middleware/http-error.js';
import { localDateForTimezone } from '../doctors/services/doctor.service.js';
import { getMedicalRecords } from '../medical-records/services/medical-record.service.js';
import { getPatientPrescriptions } from '../prescriptions/services/prescription.service.js';

function localClock(timezone, at) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone,
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}

function assertConsultationWindow(appointment, at) {
  if (appointment.local_date !== localDateForTimezone(appointment.practice_timezone, at)) {
    throw new HttpError(409, 'This appointment is not scheduled for today.');
  }
  const clock = localClock(appointment.practice_timezone, at);
  if (!appointment.available || clock < appointment.consultation_start || clock >= appointment.consultation_end) {
    throw new HttpError(409, 'Care requests are available during today’s chamber consultation hours.');
  }
}

async function lockAppointment(transaction, appointmentId, userId, role) {
  const owner = role === 'PATIENT' ? 'patient_profile.user_id' : 'doctor_profile.user_id';
  const result = await transaction.query(`SELECT appointment.id, appointment.doctor_id,
      appointment.patient_id, appointment.local_date::text AS local_date,
      appointment.status, appointment.consultation_status,
      doctor.verification_status AS doctor_verification_status,
      coalesce(availability.practice_timezone,doctor.practice_timezone) AS practice_timezone,
      availability.available,
      to_char(availability.consultation_start,'HH24:MI') AS consultation_start,
      to_char(availability.consultation_end,'HH24:MI') AS consultation_end
    FROM public.appointments AS appointment
    JOIN public.doctors AS doctor ON doctor.id=appointment.doctor_id
    JOIN public.profiles AS doctor_profile ON doctor_profile.id=doctor.profile_id
    JOIN public.patients AS patient ON patient.id=appointment.patient_id
    JOIN public.profiles AS patient_profile ON patient_profile.id=patient.profile_id
    LEFT JOIN public.doctor_daily_availability AS availability
      ON availability.doctor_id=appointment.doctor_id AND availability.local_date=appointment.local_date
    WHERE appointment.id=$1 AND ${owner}=$2 FOR UPDATE OF appointment`, [appointmentId, userId]);
  if (!result.rows[0]) throw new HttpError(404, 'Appointment not found.');
  return result.rows[0];
}

async function audit(transaction, userId, action, appointment) {
  await transaction.query(`INSERT INTO public.audit_logs
    (user_id,action,entity_type,entity_id,metadata)
    VALUES ($1,$2,'APPOINTMENT',$3,jsonb_build_object('patient_id',$4::text,'doctor_id',$5::text))`,
  [userId, action, appointment.id, appointment.patient_id, appointment.doctor_id]);
}

export async function requestCare(userId, appointmentId, database = pool, at = new Date()) {
  return withTransaction(async transaction => {
    const appointment = await lockAppointment(transaction, appointmentId, userId, 'PATIENT');
    if (appointment.status !== 'BOOKED' || !['NONE', 'DECLINED'].includes(appointment.consultation_status)) {
      throw new HttpError(409, 'This appointment cannot request care.');
    }
    if (appointment.doctor_verification_status !== 'VERIFIED') throw new HttpError(403, 'Doctor is not verified.');
    assertConsultationWindow(appointment, at);
    await transaction.query(`UPDATE public.appointments SET consultation_status='PENDING',
      care_requested_at=now(), care_decided_at=NULL WHERE id=$1`, [appointment.id]);
    await audit(transaction, userId, 'CARE_REQUESTED', appointment);
    return { id: appointment.id, consultation_status: 'PENDING' };
  }, database);
}

export async function decideCare(userId, appointmentId, decision, database = pool, at = new Date()) {
  if (!['accept', 'decline'].includes(decision)) throw new HttpError(400, 'Invalid care decision.');
  return withTransaction(async transaction => {
    // Serialize accept decisions for this doctor, including different appointments.
    const doctor = (await transaction.query(`SELECT doctor.id, doctor.verification_status
      FROM public.doctors AS doctor JOIN public.profiles AS profile ON profile.id=doctor.profile_id
      WHERE profile.user_id=$1 FOR UPDATE OF doctor`, [userId])).rows[0];
    if (!doctor || doctor.verification_status !== 'VERIFIED') throw new HttpError(403, 'Verified doctor required.');
    const appointment = await lockAppointment(transaction, appointmentId, userId, 'DOCTOR');
    if (appointment.status !== 'BOOKED' || appointment.consultation_status !== 'PENDING') {
      throw new HttpError(409, 'No pending care request exists for this appointment.');
    }
    assertConsultationWindow(appointment, at);
    if (decision === 'decline') {
      await transaction.query(`UPDATE public.appointments SET consultation_status='DECLINED',
        care_decided_at=now() WHERE id=$1`, [appointment.id]);
      await audit(transaction, userId, 'CARE_DECLINED', appointment);
      return { id: appointment.id, consultation_status: 'DECLINED' };
    }
    const active = await transaction.query(`SELECT id FROM public.appointments
      WHERE doctor_id=$1 AND consultation_status='ACTIVE' LIMIT 1`, [doctor.id]);
    if (active.rows[0]) throw new HttpError(409, 'Complete your active consultation first.');
    const digest = createHash('sha256').update(randomBytes(32)).digest('hex');
    await transaction.query(`UPDATE public.appointments SET consultation_status='ACTIVE',
      care_decided_at=now(), consultation_started_at=now() WHERE id=$1`, [appointment.id]);
    await transaction.query(`INSERT INTO public.access_sessions
      (patient_id,doctor_id,access_token,expires_at,status,appointment_id)
      VALUES ($1,$2,$3,now()+interval '24 hours','ACTIVE',$4)`,
    [appointment.patient_id, doctor.id, digest, appointment.id]);
    await audit(transaction, userId, 'CONSULTATION_STARTED', appointment);
    return { id: appointment.id, consultation_status: 'ACTIVE', patient_id: appointment.patient_id };
  }, database);
}

export async function completeConsultation(userId, appointmentId, database = pool) {
  return withTransaction(async transaction => {
    const appointment = await lockAppointment(transaction, appointmentId, userId, 'DOCTOR');
    const verified = await transaction.query(`SELECT 1 FROM public.doctors
      WHERE id=$1 AND verification_status='VERIFIED'`, [appointment.doctor_id]);
    if (!verified.rows[0]) throw new HttpError(403, 'Verified doctor required.');
    if (appointment.consultation_status !== 'ACTIVE') throw new HttpError(409, 'Consultation is not active.');
    await transaction.query(`UPDATE public.appointments SET consultation_status='COMPLETED',
      consultation_completed_at=now() WHERE id=$1`, [appointment.id]);
    await transaction.query(`UPDATE public.access_sessions SET revoked_at=COALESCE(revoked_at,now())
      WHERE appointment_id=$1`, [appointment.id]);
    await audit(transaction, userId, 'CONSULTATION_COMPLETED', appointment);
    return { id: appointment.id, consultation_status: 'COMPLETED' };
  }, database);
}

export async function activeConsultation(user, appointmentId, database = pool) {
  const result = await query(`SELECT appointment.id, appointment.patient_id,
    appointment.local_date::text AS local_date, appointment.queue_position,
    patient_profile.full_name, patient.date_of_birth, patient.gender, patient.blood_group,
    patient.emergency_contact, doctor.verification_status
    FROM public.appointments AS appointment
    JOIN public.doctors AS doctor ON doctor.id=appointment.doctor_id
    JOIN public.profiles AS doctor_profile ON doctor_profile.id=doctor.profile_id
    JOIN public.patients AS patient ON patient.id=appointment.patient_id
    JOIN public.profiles AS patient_profile ON patient_profile.id=patient.profile_id
    WHERE appointment.id=$1 AND doctor_profile.user_id=$2
      AND appointment.consultation_status='ACTIVE' AND appointment.status='BOOKED'
      AND EXISTS (SELECT 1 FROM public.access_sessions AS session
        WHERE session.appointment_id=appointment.id AND session.doctor_id=doctor.id
          AND session.patient_id=appointment.patient_id AND session.status='ACTIVE'
          AND session.revoked_at IS NULL AND session.expires_at > now())`,
  [appointmentId, user.id], database);
  const visit = result.rows[0];
  if (!visit || visit.verification_status !== 'VERIFIED') throw new HttpError(403, 'No active consultation access.');
  const [records, prescriptions] = await Promise.all([
    getMedicalRecords(user, visit.patient_id, database),
    getPatientPrescriptions(user, visit.patient_id, database),
  ]);
  return { ...visit, records, prescriptions };
}
