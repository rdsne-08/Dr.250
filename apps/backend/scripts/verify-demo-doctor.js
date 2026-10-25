import { pathToFileURL } from 'node:url';

import { pool, withTransaction, closeDatabase } from '../src/database/pool.js';
import { HttpError } from '../src/middleware/http-error.js';

export async function verifyDemoDoctor({ doctorEmail, licenseNumber, operatorEmail }, database = pool) {
  if (![doctorEmail, licenseNumber, operatorEmail].every(value => typeof value === 'string' && value.trim())) {
    throw new Error('Doctor email, stored license number, and operator email are required.');
  }
  return withTransaction(async transaction => {
    const operator = await transaction.query(`
      SELECT app_user.id FROM public.users AS app_user
      JOIN public.profiles AS profile ON profile.user_id = app_user.id
      WHERE lower(btrim(app_user.email)) = lower(btrim($1)) AND profile.role = 'ADMIN'
    `, [operatorEmail.trim()]);
    if (operator.rows.length !== 1) {
      throw new HttpError(403, 'An existing internal admin identity is required.');
    }

    const doctor = await transaction.query(`
      UPDATE public.doctors AS doctor
      SET verification_status = 'VERIFIED'
      FROM public.profiles AS profile, public.users AS app_user
      WHERE doctor.profile_id = profile.id AND profile.user_id = app_user.id
        AND lower(btrim(app_user.email)) = lower(btrim($1))
        AND doctor.license_number = $2 AND profile.role = 'DOCTOR'
        AND doctor.verification_status = 'PENDING'
        AND EXISTS (
          SELECT 1 FROM public.profiles AS operator_profile
          WHERE operator_profile.user_id = $3 AND operator_profile.role = 'ADMIN'
        )
      RETURNING doctor.id, doctor.verification_status, doctor.updated_at
    `, [doctorEmail.trim(), licenseNumber.trim(), operator.rows[0].id]);
    if (doctor.rows.length !== 1) {
      throw new HttpError(404, 'A pending doctor with that email and license number was not found.');
    }
    await transaction.query(`
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      VALUES ($1, 'VERIFICATION_STATUS_CHANGED', 'DOCTOR', $2, $3::jsonb)
    `, [operator.rows[0].id, doctor.rows[0].id, JSON.stringify({ status: 'VERIFIED' })]);
    return doctor.rows[0];
  }, database);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [doctorEmail, licenseNumber, operatorEmail] = process.argv.slice(2);
  try {
    const result = await verifyDemoDoctor({ doctorEmail, licenseNumber, operatorEmail });
    console.log(`Verified doctor ${result.id}; audit event recorded.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
