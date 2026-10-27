import { uuidField } from '../../../validation/request.js';
import { HttpError } from '../../../middleware/http-error.js';
import { COUNTRY_CODES } from '../../doctors/services/practice-options.js';

export function validateCountry(request, _response, next) {
  try {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some(key => key !== 'country_code')
      || typeof body.country_code !== 'string'
      || !COUNTRY_CODES.has(body.country_code)) {
      throw new HttpError(400, 'Select a valid ISO country code.');
    }
    request.validatedCountry = body.country_code;
    next();
  } catch (error) { next(error); }
}

export function validatePatientId(request, _response, next) {
  try {
    request.validatedParams = {
      patientId: uuidField(request.params, 'patientId'),
    };
    next();
  } catch (error) {
    next(error);
  }
}
