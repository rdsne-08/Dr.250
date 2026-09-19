import { requireJsonObject, stringField, uuidField } from '../../../validation/request.js';

export function validatePrescriptionPatient(request, _response, next) {
  try {
    request.validatedParams = { patientId: uuidField(request.params, 'patientId') };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCreatePrescription(request, _response, next) {
  try {
    const body = requireJsonObject(request.body);
    request.validatedBody = {
      patientId: uuidField(body, 'patient_id'),
      medicine: stringField(body, 'medicine', { max: 200 }),
      dosage: stringField(body, 'dosage', { max: 120 }),
      duration: stringField(body, 'duration', { required: false, max: 120 }),
      instructions: stringField(body, 'instructions', { max: 1000 }),
    };
    next();
  } catch (error) {
    next(error);
  }
}
