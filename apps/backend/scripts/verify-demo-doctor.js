import { pathToFileURL } from 'node:url';

import { pool, query, closeDatabase } from '../src/database/pool.js';
import { verifyEntity } from '../src/modules/admin/services/admin.service.js';

export async function verifyDemoDoctor({ doctorEmail, licenseNumber, operatorEmail }, database = pool) {
  if (![doctorEmail, licenseNumber, operatorEmail].every(value => typeof value === 'string' && value.trim())) {
    throw new Error('Doctor email, stored license number, and operator email are required.');
  }
  const operator = await query(`
    SELECT app_user.id FROM public.users AS app_user
    JOIN public.profiles AS profile ON profile.user_id = app_user.id
    WHERE lower(app_user.email) = lower($1) AND profile.role = 'ADMIN'
  `, [operatorEmail.trim()], database);
  if (operator.rows.length !== 1) throw new Error('An existing internal admin identity is required.');

  const doctor = await query(`
    SELECT doctor.id, doctor.verification_status FROM public.doctors AS doctor
    JOIN public.profiles AS profile ON profile.id = doctor.profile_id
    JOIN public.users AS app_user ON app_user.id = profile.user_id
    WHERE lower(app_user.email) = lower($1) AND doctor.license_number = $2
      AND profile.role = 'DOCTOR'
  `, [doctorEmail.trim(), licenseNumber.trim()], database);
  if (doctor.rows.length !== 1 || doctor.rows[0].verification_status !== 'PENDING') {
    throw new Error('A pending doctor with that email and license number was not found.');
  }
  return verifyEntity({ id: doctor.rows[0].id, entityType: 'DOCTOR', status: 'VERIFIED',
    adminUserId: operator.rows[0].id }, database);
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
