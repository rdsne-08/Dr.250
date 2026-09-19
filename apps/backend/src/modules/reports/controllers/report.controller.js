import { getPatientReports, submitReport } from '../services/report.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function listReports(request, response) {
  const reports = await getPatientReports(request.user, request.validatedParams.patientId);
  sendSuccess(response, { reports });
}

export async function createReport(request, response) {
  const report = await submitReport(
    request.user,
    request.validatedBody,
    undefined,
    request.laboratory,
  );
  sendSuccess(response, { report }, request.user.role === 'DOCTOR' ? 201 : 200);
}
