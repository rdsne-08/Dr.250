import { logProviderRead } from '../../sessions/services/audit.service.js';
import path from 'node:path';

import { findReportFile } from '../../labs/services/report-file.service.js';
import {
  getAuthorizedReportFile,
  getPatientReports,
  submitReport,
} from '../services/report.service.js';
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

export async function sendReportDownload(user, reportId, response, {
  getReport = getAuthorizedReportFile,
  findFile = findReportFile,
  logAccess = logProviderRead,
} = {}) {
  const report = await getReport(user, reportId);
  const filePath = await findFile(report.id);
  const extension = path.extname(filePath);
  const safeName = report.test_name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
  await new Promise((resolve, reject) => {
    response.download(filePath, `${safeName || 'lab-report'}${extension}`,
      error => error ? reject(error) : resolve());
  });
  await logAccess(user, report.patient_id, 'REPORT_DOWNLOAD_AUTHORIZED', undefined,
    { type: 'LAB_REPORT', id: report.id });
}

export async function downloadReport(request, response) {
  await sendReportDownload(request.user, request.validatedParams.reportId, response);
}
