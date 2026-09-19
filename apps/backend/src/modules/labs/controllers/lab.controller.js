import { getAssignedReports, uploadAssignedReport } from '../services/lab.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function profile(request, response) {
  sendSuccess(response, { laboratory: request.laboratory });
}

export async function reports(request, response) {
  sendSuccess(response, { reports: await getAssignedReports(request.laboratory.id) });
}

export async function uploadReport(request, response) {
  const report = await uploadAssignedReport(request.laboratory, request.validatedBody);
  sendSuccess(response, { report });
}
