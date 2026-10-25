import { pool, withTransaction } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

export async function verifyEntity({ id, entityType, status, adminUserId }, database = pool) {
  if (entityType !== 'DOCTOR') throw new HttpError(400, 'Only doctors can be verified.');

  return withTransaction(async (transaction) => {
    const result = await transaction.query(
      `
        UPDATE public.doctors
        SET verification_status = $2
        WHERE id = $1
        RETURNING id, verification_status, updated_at
      `,
      [id, status],
    );

    if (!result.rows[0]) {
      throw new HttpError(404, 'Doctor not found.', {
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
