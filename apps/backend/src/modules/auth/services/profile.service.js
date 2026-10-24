import { pool, query, withTransaction } from '../../../database/pool.js';

const PROFILE_SELECT = `
  SELECT
    p.id AS profile_id,
    p.user_id,
    u.email,
    p.full_name,
    p.phone,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles AS p
  INNER JOIN public.users AS u ON u.id = p.user_id
`;

export async function findProfileByUserId(userId, database = pool) {
  const result = await query(
    `${PROFILE_SELECT} WHERE p.user_id = $1 LIMIT 1`,
    [userId],
    database,
  );

  return result.rows[0] ?? null;
}

export async function createProfile(
  { userId, email, fullName, role, specialization, labName, licenseNumber, passwordHash },
  database = pool,
) {
  const normalizedEmail = email.trim().toLowerCase();
  return withTransaction(async (transaction) => {
    await transaction.query(
      `INSERT INTO public.users (id, email) VALUES ($1, $2)`,
      [userId, normalizedEmail],
    );

    if (passwordHash) {
      await transaction.query(
        'INSERT INTO private.account_credentials (user_id, password_hash) VALUES ($1, $2)',
        [userId, passwordHash],
      );
    }

    const result = await transaction.query(
      `
        INSERT INTO public.profiles (user_id, full_name, role)
        VALUES ($1, $2, $3)
        RETURNING id AS profile_id, user_id, full_name, phone, role, created_at, updated_at
      `,
      [userId, fullName, role],
    );

    let patientId;
    let doctor;
    let laboratory;
    if (role === 'PATIENT') {
      const patientResult = await transaction.query(
        `
          INSERT INTO public.patients (profile_id)
          VALUES ($1)
          RETURNING id
        `,
        [result.rows[0].profile_id],
      );
      patientId = patientResult.rows[0].id;
    }

    if (role === 'DOCTOR') {
      const doctorResult = await transaction.query(
        `
          INSERT INTO public.doctors (profile_id, specialization, license_number)
          VALUES ($1, $2, $3)
          RETURNING id, specialization, license_number, verification_status
        `,
        [result.rows[0].profile_id, specialization, licenseNumber],
      );
      doctor = doctorResult.rows[0];
    }

    if (role === 'LAB') {
      const laboratoryResult = await transaction.query(
        `
          INSERT INTO public.laboratories (profile_id, lab_name, license_number)
          VALUES ($1, $2, $3)
          RETURNING id, lab_name, license_number, verification_status
        `,
        [result.rows[0].profile_id, labName, licenseNumber],
      );
      laboratory = laboratoryResult.rows[0];
    }

    return {
      ...result.rows[0],
      email: normalizedEmail,
      ...(patientId ? { patient_id: patientId } : {}),
      ...(doctor
        ? {
            doctor_id: doctor.id,
            specialization: doctor.specialization,
            license_number: doctor.license_number,
            verification_status: doctor.verification_status,
          }
        : {}),
      ...(laboratory
        ? {
            laboratory_id: laboratory.id,
            lab_name: laboratory.lab_name,
            license_number: laboratory.license_number,
            verification_status: laboratory.verification_status,
          }
        : {}),
    };
  }, database);
}
