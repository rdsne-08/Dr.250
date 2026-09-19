import { dateField, requireJsonObject, uuidField } from '../../../validation/request.js';
import { HttpError } from '../../../middleware/http-error.js';

export function validateCreateSession(request, _response, next) {
  try {
    const body = requireJsonObject(request.body);
    const expiresAt = dateField(body, 'expires_at');

    if (new Date(expiresAt) <= new Date()) {
      throw new HttpError(400, 'expires_at must be in the future.', { code: 'VALIDATION_ERROR' });
    }

    request.validatedBody = {
      doctorId: uuidField(body, 'doctor_id'),
      expiresAt,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateSessionId(request, _response, next) {
  try {
    request.validatedParams = { sessionId: uuidField(request.params, 'sessionId') };
    next();
  } catch (error) {
    next(error);
  }
}
