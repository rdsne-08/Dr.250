import { logProviderRead } from '../../sessions/services/audit.service.js';
import { pool, query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';
import { assertDoctorPatientAccess, getVerifiedDoctor } from '../../doctors/services/doctor.service.js';
import { getVerifiedLab, uploadAssignedReport } from '../../labs/services/lab.service.js';
import { authorizePatientDataAccess } from '../../sessions/services/access.service.js';

const REPORT_SELECT = `
  SELECT report.id, report.patient_id, report.laboratory_id,
         report.requested_by_doctor_id, report.test_name,
         report.report_url AS file_url, report.status,
         report.created_at, report.updated_at,
         laboratory.lab_name
  FROM public.lab_reports AS report
  INNER JOIN public.laboratories AS laboratory ON laboratory.id = report.laboratory_id
`;

export async function getPatientReports(user, patientId, database = pool) {
  let laboratoryId;
  if (user.role === 'LAB') {
    laboratoryId = (await getVerifiedLab(user.id, database)).id;
  } else {
    await authorizePatientDataAccess(user, patientId, database);
  }

  const values = laboratoryId ? [patientId, laboratoryId] : [patientId];
  const labConstraint = laboratoryId ? 'AND report.laboratory_id = $2' : '';
  const result = await query(
    `${REPORT_SELECT}
     WHERE report.patient_id = $1 ${labConstraint}
     ORDER BY report.created_at DESC`,
    values,
    database,
  );
  await logProviderRead(user, patientId, 'REPORTS_READ', database);
  return result.rows;
}

export async function getAuthorizedReportFile(user, reportId, database = pool) {
  const result = await query(
    `
      SELECT report.id, report.patient_id, report.laboratory_id,
             report.test_name, report.report_url AS file_url, report.status
      FROM public.lab_reports AS report
      WHERE report.id = $1
      LIMIT 1
    `,
    [reportId],
    database,
  );
  const report = result.rows[0];

  if (!report || report.status !== 'COMPLETED' || !report.file_url) {
    throw new HttpError(404, 'Completed report not found.', { code: 'REPORT_NOT_FOUND' });
  }

  if (user.role === 'LAB') {
    const laboratory = await getVerifiedLab(user.id, database);
    if (laboratory.id !== report.laboratory_id) {
      throw new HttpError(403, 'This report is assigned to another laboratory.', {
        code: 'REPORT_ACCESS_DENIED',
      });
    }
  } else {
    await authorizePatientDataAccess(user, report.patient_id, database);
  }

  return report;
}

export async function createReportRequest(user, report, database = pool, suppliedDoctor) {
  const doctor = suppliedDoctor ?? await getVerifiedDoctor(user.id, database);
  await assertDoctorPatientAccess(doctor, report.patientId, database);
  const result = await query(
    `
      INSERT INTO public.lab_reports
        (patient_id, laboratory_id, requested_by_doctor_id, test_name, status)
      SELECT $1, laboratory.id, $3, $4, 'REQUESTED'
      FROM public.laboratories AS laboratory
      WHERE laboratory.id = $2 AND laboratory.verification_status = 'VERIFIED'
      RETURNING id, patient_id, laboratory_id, requested_by_doctor_id,
                test_name, report_url AS file_url, status, created_at, updated_at
    `,
    [report.patientId, report.laboratoryId, doctor.id, report.testName],
    database,
  );

  if (!result.rows[0]) {
    throw new HttpError(400, 'The selected laboratory is unavailable or not verified.', {
      code: 'INVALID_LABORATORY',
    });
  }
  return result.rows[0];
}

export async function submitReport(user, report, database = pool, suppliedLab) {
  if (user.role === 'DOCTOR') {
    return createReportRequest(user, report, database);
  }

  const laboratory = suppliedLab ?? await getVerifiedLab(user.id, database);
  return uploadAssignedReport(laboratory, report, database);
}
