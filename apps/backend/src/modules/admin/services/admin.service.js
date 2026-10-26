import { pool, query, withTransaction } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

export async function listDoctorApplications(database = pool) {
  const result = await query(`
    SELECT doctor.id, doctor.specialization, doctor.license_number,
           doctor.verification_status, doctor.created_at, doctor.updated_at,
           profile.full_name, app_user.email
    FROM public.doctors AS doctor
    JOIN public.profiles AS profile ON profile.id = doctor.profile_id
    JOIN public.users AS app_user ON app_user.id = profile.user_id
    ORDER BY doctor.created_at DESC, doctor.id DESC
  `, [], database);
  return result.rows;
}

export async function verifyEntity({ id, entityType, status, adminUserId }, database = pool) {
  if (entityType !== 'DOCTOR') throw new HttpError(400, 'Only doctors can be verified.');
  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    throw new HttpError(400, 'Decision must be VERIFIED or REJECTED.');
  }

  return withTransaction(async (transaction) => {
    const result = await transaction.query(
      `
        UPDATE public.doctors
        SET verification_status = $2
        WHERE id = $1 AND verification_status = 'PENDING'
        RETURNING id, verification_status, updated_at
      `,
      [id, status],
    );

    if (!result.rows[0]) {
      const existing = await transaction.query('SELECT id FROM public.doctors WHERE id = $1', [id]);
      if (!existing.rows[0]) {
        throw new HttpError(404, 'Doctor application not found.', {
          code: 'VERIFICATION_TARGET_NOT_FOUND',
        });
      }
      throw new HttpError(409, 'This doctor application is no longer pending.', {
        code: 'VERIFICATION_NOT_PENDING',
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
