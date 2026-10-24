import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

// Called only after the corresponding resource authorization succeeds.
export async function logProviderRead(user, patientId, action, database = pool, resource = {}) {
  if (!['DOCTOR', 'LAB', 'ADMIN'].includes(user.role)) return;
  const values = [user.id, patientId, action, user.role,
    resource.type ?? 'PATIENT', resource.id ?? patientId];
  if (user.role === 'DOCTOR') {
    // The update and event are one statement. A revoked, expired, or unverified
    // doctor cannot leave an event or receive the resource if access changed.
    const result = await query(`
      WITH active_session AS (
        SELECT session.id
        FROM public.access_sessions AS session
        JOIN public.doctors AS doctor ON doctor.id = session.doctor_id
        JOIN public.profiles AS profile ON profile.id = doctor.profile_id
        WHERE profile.user_id = $1 AND doctor.verification_status = 'VERIFIED'
          AND session.patient_id = $2 AND session.status = 'ACTIVE'
          AND session.revoked_at IS NULL AND session.expires_at > now()
        ORDER BY session.created_at DESC, session.id DESC LIMIT 1
        FOR UPDATE OF session
      ), touched AS (
        UPDATE public.access_sessions AS session SET last_accessed_at = now()
        WHERE session.id = (SELECT id FROM active_session)
        RETURNING session.id
      )
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      SELECT $1, $3, 'PATIENT_ACCESS', $2,
             jsonb_build_object('role', $4::text, 'resource_type', $5::text, 'resource_id', $6::text)
      FROM touched RETURNING id
    `, values, database);
    if (!result.rows[0]) {
      throw new HttpError(403, 'An active patient access session is required.', {
        code: 'PATIENT_ACCESS_DENIED',
      });
    }
    return;
  }
  await query(`
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES ($1, $3, 'PATIENT_ACCESS', $2,
            jsonb_build_object('role', $4::text, 'resource_type', $5::text, 'resource_id', $6::text))
  `, values, database);
}

export async function getOwnAccessLogs(userId, database = pool) {
  const result = await query(`
    SELECT log.id, log.action, log.created_at, log.metadata->>'role' AS role,
           actor.full_name AS provider_name
    FROM public.audit_logs AS log
    JOIN public.patients AS patient ON patient.id = log.entity_id
    JOIN public.profiles AS owner ON owner.id = patient.profile_id
    LEFT JOIN public.profiles AS actor ON actor.user_id = log.user_id
    WHERE owner.user_id = $1 AND log.entity_type = 'PATIENT_ACCESS'
    ORDER BY log.created_at DESC, log.id DESC LIMIT 200
  `, [userId], database);
  return result.rows;
}
