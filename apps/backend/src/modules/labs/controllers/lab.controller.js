import { logProviderRead } from '../../sessions/services/audit.service.js';
import { getAssignedReports, uploadAssignedReport } from '../services/lab.service.js';
import { removeReportFile, saveReportFile } from '../services/report-file.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function profile(request, response) {
  sendSuccess(response, { laboratory: request.laboratory });
}

export async function reports(request, response) {
  const reports = await getAssignedReports(request.laboratory.id);
  for (const patientId of new Set(reports.map(report => report.patient_id))) {
    await logProviderRead(request.user, patientId, 'LAB_ASSIGNMENTS_READ');
  }
  sendSuccess(response, { reports });
}

export async function uploadReport(request, response) {
  const upload = { ...request.validatedBody };
  let savedFile = false;

  if (request.file) {
    await saveReportFile(upload.reportId, request.file);
    savedFile = true;
    upload.fileUrl = `${request.protocol}://${request.get('host')}/api/reports/${upload.reportId}/file`;
  }

  try {
    const report = await uploadAssignedReport(request.laboratory, upload);
    sendSuccess(response, { report });
  } catch (error) {
    if (savedFile) await removeReportFile(upload.reportId);
    throw error;
  }
}
