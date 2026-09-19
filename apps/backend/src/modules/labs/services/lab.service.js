import { pool, query, withTransaction } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

const LAB_PROFILE_SELECT = `
  SELECT laboratory.id, laboratory.lab_name, laboratory.license_number,
         laboratory.verification_status, laboratory.created_at, laboratory.updated_at,
         profile.full_name, profile.phone, profile.role, app_user.email
  FROM public.laboratories AS laboratory
  INNER JOIN public.profiles AS profile ON profile.id = laboratory.profile_id
  INNER JOIN public.users AS app_user ON app_user.id = profile.user_id
`;

export async function findLabByUserId(userId, database = pool) {
  const result = await query(
    `${LAB_PROFILE_SELECT} WHERE profile.user_id = $1 LIMIT 1`,
    [userId],
    database,
  );
  return result.rows[0] ?? null;
}

export async function getVerifiedLab(userId, database = pool) {
  const laboratory = await findLabByUserId(userId, database);

  if (!laboratory) {
    throw new HttpError(404, 'Laboratory profile not found.', { code: 'LAB_NOT_FOUND' });
  }

  if (laboratory.verification_status !== 'VERIFIED') {
    throw new HttpError(403, 'A verified laboratory profile is required.', {
      code: 'LAB_NOT_VERIFIED',
    });
  }

  return laboratory;
}

export async function getAssignedReports(laboratoryId, database = pool) {
  const result = await query(
    `
      SELECT report.id, report.patient_id, report.laboratory_id,
             report.requested_by_doctor_id, report.test_name,
             report.report_url AS file_url, report.status,
             report.created_at, report.updated_at,
             patient_profile.full_name AS patient_name,
             doctor_profile.full_name AS requested_by_doctor
      FROM public.lab_reports AS report
      INNER JOIN public.patients AS patient ON patient.id = report.patient_id
      INNER JOIN public.profiles AS patient_profile ON patient_profile.id = patient.profile_id
      LEFT JOIN public.doctors AS doctor ON doctor.id = report.requested_by_doctor_id
      LEFT JOIN public.profiles AS doctor_profile ON doctor_profile.id = doctor.profile_id
      WHERE report.laboratory_id = $1
      ORDER BY report.created_at DESC
    `,
    [laboratoryId],
    database,
  );
  return result.rows;
}

export async function uploadAssignedReport(laboratory, upload, database = pool) {
  return withTransaction(async (transaction) => {
    const existingResult = await transaction.query(
      `
        SELECT id, patient_id, test_name, report_url, status
        FROM public.lab_reports
        WHERE id = $1
          AND laboratory_id = $2
          AND ($3::text IS NULL OR test_name = $3)
        FOR UPDATE
      `,
      [upload.reportId, laboratory.id, upload.testName ?? null],
    );
    const existing = existingResult.rows[0];

    if (!existing) {
      throw new HttpError(404, 'Assigned report not found.', { code: 'REPORT_NOT_FOUND' });
    }

    const allowedTransitions = {
      REQUESTED: ['REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'CANCELLED'],
      SAMPLE_COLLECTED: ['SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
      PROCESSING: ['PROCESSING', 'COMPLETED', 'CANCELLED'],
      COMPLETED: ['COMPLETED'],
      CANCELLED: ['CANCELLED'],
    };

    if (!allowedTransitions[existing.status]?.includes(upload.status)) {
      throw new HttpError(409, `A ${existing.status} report cannot move to ${upload.status}.`, {
        code: 'INVALID_REPORT_TRANSITION',
      });
    }

    const result = await transaction.query(
      `
        UPDATE public.lab_reports
        SET report_url = COALESCE($3, report_url), status = $4
        WHERE id = $1 AND laboratory_id = $2
        RETURNING id, patient_id, laboratory_id, requested_by_doctor_id,
                  test_name, report_url AS file_url, status, created_at, updated_at
      `,
      [upload.reportId, laboratory.id, upload.fileUrl ?? null, upload.status],
    );
    const report = result.rows[0];

    if (upload.result && upload.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await transaction.query(
        `
          INSERT INTO public.medical_records
            (patient_id, title, description, document_url, record_type)
          VALUES ($1, $2, $3, $4, 'LAB_REPORT')
        `,
        [report.patient_id, report.test_name, upload.result, report.file_url],
      );
    }

    return { ...report, result: upload.result ?? null };
  }, database);
}
