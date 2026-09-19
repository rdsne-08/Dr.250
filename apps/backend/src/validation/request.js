import { HttpError } from '../middleware/http-error.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireJsonObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.', { code: 'INVALID_BODY' });
  }

  return body;
}

export function stringField(body, field, options = {}) {
  const { required = true, max = 500, min = 1, nullable = false } = options;
  const value = body[field];

  if (value === null && nullable) {
    return null;
  }

  if (value === undefined && !required) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} ${required ? 'is required' : 'must be a string'}.`, {
      code: 'VALIDATION_ERROR',
    });
  }

  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max} characters.`, {
      code: 'VALIDATION_ERROR',
    });
  }

  return normalized;
}

export function uuidField(source, field, options = {}) {
  const { required = true } = options;
  const value = source[field];

  if ((value === undefined || value === null || value === '') && !required) {
    return undefined;
  }

  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new HttpError(400, `${field} must be a valid UUID.`, { code: 'VALIDATION_ERROR' });
  }

  return value.toLowerCase();
}

export function enumField(body, field, allowed, options = {}) {
  const { required = true } = options;
  const value = body[field];

  if (value === undefined && !required) {
    return undefined;
  }

  if (typeof value !== 'string' || !allowed.includes(value.trim().toUpperCase())) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}.`, {
      code: 'VALIDATION_ERROR',
    });
  }

  return value.trim().toUpperCase();
}

export function urlField(body, field, options = {}) {
  const value = stringField(body, field, options);

  if (value === undefined || value === null) {
    return value;
  }

  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch {
    throw new HttpError(400, `${field} must be a valid HTTP or HTTPS URL.`, {
      code: 'VALIDATION_ERROR',
    });
  }

  return value;
}

export function dateField(body, field, options = {}) {
  const value = stringField(body, field, { ...options, max: 40 });

  if (value === undefined || value === null) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `${field} must be a valid date.`, { code: 'VALIDATION_ERROR' });
  }

  return parsed.toISOString();
}

export function asyncMiddleware(handler) {
  return function wrappedMiddleware(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
