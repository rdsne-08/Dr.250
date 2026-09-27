import { sendSuccess } from '../../../middleware/response.js';
import {
  getAiIntegrationStatus,
  getMedicalHistoryAnswer,
  getPreVisitSummary,
  getSymptomGuidance,
} from '../services/ai.service.js';

export function health(_request, response) {
  sendSuccess(response, getAiIntegrationStatus());
}

export async function history(request, response) {
  const result = await getMedicalHistoryAnswer(request.user, request.body);
  sendSuccess(response, result);
}

export async function summary(request, response) {
  const result = await getPreVisitSummary(request.user, request.body);
  sendSuccess(response, result);
}

export async function symptoms(request, response) {
  const result = await getSymptomGuidance(request.user, request.body);
  sendSuccess(response, result);
}
