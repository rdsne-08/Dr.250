import { getAssignedReports, uploadAssignedReport } from '../services/lab.service.js';

export async function profile(request, response) {
  response.status(200).json({ laboratory: request.laboratory });
}

export async function reports(request, response) {
  response.status(200).json({ reports: await getAssignedReports(request.laboratory.id) });
}

export async function uploadReport(request, response) {
  const report = await uploadAssignedReport(request.laboratory, request.validatedBody);
  response.status(201).json({ report });
}
