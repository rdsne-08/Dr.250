import { uuidField } from '../../../validation/request.js';

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
