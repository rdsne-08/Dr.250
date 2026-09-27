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

export async function downloadReport(request, response) {
  const report = await getAuthorizedReportFile(request.user, request.validatedParams.reportId);
  const filePath = await findReportFile(report.id);
  const extension = path.extname(filePath);
  const safeName = report.test_name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
  response.download(filePath, `${safeName || 'lab-report'}${extension}`);
}
