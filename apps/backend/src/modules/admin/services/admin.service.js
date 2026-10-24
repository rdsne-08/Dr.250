import { pool, query, withTransaction } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

export async function getUsers(database = pool) {
  const result = await query(
    `
      SELECT app_user.id, app_user.email, profile.full_name, profile.phone,
             profile.role, app_user.created_at, app_user.updated_at
      FROM public.users AS app_user
      INNER JOIN public.profiles AS profile ON profile.user_id = app_user.id
      ORDER BY app_user.created_at DESC
    `,
    [],
    database,
  );
  return result.rows;
}

export async function getDoctors(database = pool) {
  const result = await query(
    `
      SELECT doctor.id, profile.user_id, profile.full_name, profile.phone,
             app_user.email, doctor.specialization, doctor.license_number,
             doctor.verification_status, doctor.created_at, doctor.updated_at
      FROM public.doctors AS doctor
      INNER JOIN public.profiles AS profile ON profile.id = doctor.profile_id
      INNER JOIN public.users AS app_user ON app_user.id = profile.user_id
      ORDER BY doctor.created_at DESC
    `,
    [],
    database,
  );
  return result.rows;
}

export async function getLaboratories(database = pool) {
  const result = await query(
    `
      SELECT laboratory.id, profile.user_id, laboratory.lab_name,
             profile.full_name, profile.phone, app_user.email,
             laboratory.license_number, laboratory.verification_status,
             laboratory.created_at, laboratory.updated_at
      FROM public.laboratories AS laboratory
      INNER JOIN public.profiles AS profile ON profile.id = laboratory.profile_id
      INNER JOIN public.users AS app_user ON app_user.id = profile.user_id
      ORDER BY laboratory.created_at DESC
    `,
    [],
    database,
  );
  return result.rows;
}

export async function getAdminOperations(database = pool) {
  const result = await query(`
    SELECT log.id, log.created_at, log.entity_type, log.metadata->>'status' AS status,
           CASE WHEN log.entity_type = 'DOCTOR' THEN doctor_profile.full_name
                WHEN log.entity_type = 'LAB' THEN laboratory.lab_name END AS provider_name
    FROM public.audit_logs AS log
    LEFT JOIN public.doctors AS doctor ON log.entity_type = 'DOCTOR' AND doctor.id = log.entity_id
    LEFT JOIN public.profiles AS doctor_profile ON doctor_profile.id = doctor.profile_id
    LEFT JOIN public.laboratories AS laboratory ON log.entity_type = 'LAB' AND laboratory.id = log.entity_id
    WHERE log.action = 'VERIFICATION_STATUS_CHANGED'
      AND log.entity_type IN ('DOCTOR', 'LAB')
    ORDER BY log.created_at DESC, log.id DESC LIMIT 20
  `, [], database);
  return { activity: result.rows, database: 'available', authentication: 'unavailable' };
}

export async function verifyEntity({ id, entityType, status, adminUserId }, database = pool) {
  const table = entityType === 'DOCTOR' ? 'doctors' : 'laboratories';

  return withTransaction(async (transaction) => {
    const result = await transaction.query(
      `
        UPDATE public.${table}
        SET verification_status = $2
        WHERE id = $1
        RETURNING id, verification_status, updated_at
      `,
      [id, status],
    );

    if (!result.rows[0]) {
      throw new HttpError(404, `${entityType === 'DOCTOR' ? 'Doctor' : 'Laboratory'} not found.`, {
        code: 'VERIFICATION_TARGET_NOT_FOUND',
      });
    }

    await transaction.query(
      `
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES ($1, 'VERIFICATION_STATUS_CHANGED', $2, $3, $4::jsonb)
      `,
      [adminUserId, entityType, id, JSON.stringify({ status })],
    );

    return { ...result.rows[0], entity_type: entityType };
  }, database);
}
