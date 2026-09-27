import { env } from '../../../config/environment.js';
import { HttpError } from '../../../middleware/http-error.js';

const AI_ENDPOINTS = Object.freeze({
  history: 'history/query',
  summary: 'summary/pre-visit',
  symptoms: 'symptom/assist',
});

function buildAiServiceUrl(path) {
  const baseUrl = `${env.aiServiceUrl.replace(/\/+$/, '')}/`;
  return new URL(path, baseUrl);
}

async function readJson(response) {
  const responseText = await response.text();

  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    throw new HttpError(502, 'The AI service returned an invalid response.', {
      code: 'INVALID_AI_RESPONSE',
    });
  }
}

function upstreamError(response, payload) {
  const statusCode = response.status === 422
    ? 400
    : response.status >= 500
      ? 502
      : response.status;
  const message = typeof payload?.detail === 'string'
    ? payload.detail
    : 'The AI service could not process the request.';

  return new HttpError(statusCode, message, {
    code: response.status >= 500 ? 'AI_SERVICE_ERROR' : 'AI_REQUEST_REJECTED',
    ...(statusCode < 500 && Array.isArray(payload?.detail)
      ? { details: payload.detail }
      : {}),
  });
}

export function getAiIntegrationStatus() {
  return {
    service: 'Dr.250 AI integration',
    status: 'ok',
  };
}

export async function requestAiService(path, actor, body, fetchImplementation = fetch) {
  let response;

  try {
    response = await fetchImplementation(buildAiServiceUrl(path), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-actor-id': actor.id,
        'x-actor-role': actor.role,
      },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(env.aiRequestTimeoutMs),
    });
  } catch (error) {
    throw new HttpError(503, 'The AI service is temporarily unavailable.', {
      code: 'AI_SERVICE_UNAVAILABLE',
      cause: error,
    });
  }

  const payload = await readJson(response);
  if (!response.ok) throw upstreamError(response, payload);

  return payload;
}

export function getMedicalHistoryAnswer(actor, request) {
  return requestAiService(AI_ENDPOINTS.history, actor, request);
}

export function getPreVisitSummary(actor, request) {
  return requestAiService(AI_ENDPOINTS.summary, actor, request);
}

export function getSymptomGuidance(actor, request) {
  return requestAiService(AI_ENDPOINTS.symptoms, actor, request);
}
