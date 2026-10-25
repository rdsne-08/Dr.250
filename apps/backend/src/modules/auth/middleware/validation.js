import { HttpError } from '../../../middleware/http-error.js';

export const SUPPORTED_ROLES = Object.freeze(['PATIENT', 'DOCTOR']);
export const SELF_REGISTER_ROLES = Object.freeze(['PATIENT', 'DOCTOR']);

function requireJsonObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
}

function normalizeEmail(value) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'email is required.');
  }

  const email = value.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email.length > 254 || !emailPattern.test(email)) {
    throw new HttpError(400, 'email must be a valid email address.');
  }

  return email;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new HttpError(400, 'password must be between 8 and 128 characters.');
  }

  return value;
}

function validateRequiredText(value, field, maxLength) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be between 1 and ${maxLength} characters.`);
  }

  return normalized;
}

export function validateRegistration(request, _response, next) {
  try {
    requireJsonObject(request.body);

    if (typeof request.body.full_name !== 'string') {
      throw new HttpError(400, 'full_name is required.');
    }

    const fullName = request.body.full_name.trim();
    if (fullName.length < 1 || fullName.length > 120) {
      throw new HttpError(400, 'full_name must be between 1 and 120 characters.');
    }

    if (typeof request.body.role !== 'string') {
      throw new HttpError(400, 'role is required.');
    }

    const role = request.body.role.trim().toUpperCase();
    if (!SELF_REGISTER_ROLES.includes(role)) {
      throw new HttpError(400, `role must be one of: ${SELF_REGISTER_ROLES.join(', ')}.`, {
        code: 'VALIDATION_ERROR',
      });
    }

    const validatedBody = {
      email: normalizeEmail(request.body.email),
      password: validatePassword(request.body.password),
      fullName,
      role,
    };

    if (role === 'DOCTOR') {
      validatedBody.specialization = validateRequiredText(
        request.body.specialization,
        'specialization',
        120,
      );
      validatedBody.licenseNumber = validateRequiredText(
        request.body.license_number,
        'license_number',
        80,
      );
    }

    request.validatedBody = validatedBody;

    next();
  } catch (error) {
    next(error);
  }
}

export function validateLogin(request, _response, next) {
  try {
    requireJsonObject(request.body);
    request.validatedBody = {
      email: normalizeEmail(request.body.email),
      password: validatePassword(request.body.password),
    };
    next();
  } catch (error) {
    next(error);
  }
}
