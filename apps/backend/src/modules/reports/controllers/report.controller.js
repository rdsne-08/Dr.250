import { getPatientReports, submitReport } from '../services/report.service.js';

export async function listReports(request, response) {
  const reports = await getPatientReports(request.user, request.validatedParams.patientId);
  response.status(200).json({ reports });
}

export async function createReport(request, response) {
  const report = await submitReport(
    request.user,
    request.validatedBody,
    undefined,
    request.laboratory,
  );
  response.status(201).json({ report });
}
