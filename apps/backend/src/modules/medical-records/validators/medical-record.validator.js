import {
  dateField,
  requireJsonObject,
  stringField,
  urlField,
  uuidField,
} from '../../../validation/request.js';
import { HttpError } from '../../../middleware/http-error.js';

function attachmentField(body) {
  if (body.attachments === undefined) {
    return undefined;
  }

  const attachments = Array.isArray(body.attachments) ? body.attachments : [body.attachments];
  if (attachments.length > 1) {
    throw new HttpError(400, 'The current record schema supports one attachment per record.', {
      code: 'VALIDATION_ERROR',
    });
  }

  return urlField({ attachment: attachments[0] }, 'attachment', { required: false, max: 2000 });
}

export function validateMedicalRecordPatient(request, _response, next) {
  try {
    request.validatedParams = { patientId: uuidField(request.params, 'patientId') };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCreateMedicalRecord(request, _response, next) {
  try {
    const body = requireJsonObject(request.body);
    request.validatedBody = {
      patientId: uuidField(body, 'patient_id'),
      diagnosis: stringField(body, 'diagnosis', { max: 300 }),
      notes: stringField(body, 'notes', { required: false, max: 5000 }),
      attachment: attachmentField(body),
      date: dateField(body, 'date', { required: false }),
    };
    next();
  } catch (error) {
    next(error);
  }
}
