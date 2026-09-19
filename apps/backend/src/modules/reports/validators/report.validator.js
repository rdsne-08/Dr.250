import {
  enumField,
  requireJsonObject,
  stringField,
  urlField,
  uuidField,
} from '../../../validation/request.js';
import { HttpError } from '../../../middleware/http-error.js';

const REPORT_STATUSES = ['REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

export function validateReportPatient(request, _response, next) {
  try {
    request.validatedParams = { patientId: uuidField(request.params, 'patientId') };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCreateReport(request, _response, next) {
  try {
    const body = requireJsonObject(request.body);

    if (request.user.role === 'LAB') {
      const status = enumField(body, 'status', REPORT_STATUSES);
      const fileUrl = urlField(body, 'file_url', { required: false, max: 2000 });
      if (status === 'COMPLETED' && !fileUrl) {
        throw new HttpError(400, 'file_url is required when status is COMPLETED.', {
          code: 'VALIDATION_ERROR',
        });
      }

      request.validatedBody = {
        reportId: uuidField(body, 'report_id'),
        testName: stringField(body, 'test_name', { required: false, max: 240 }),
        result: stringField(body, 'result', { required: false, max: 10_000 }),
        fileUrl,
        status,
      };
    } else {
      const status = enumField(body, 'status', ['REQUESTED'], { required: false }) ?? 'REQUESTED';
      request.validatedBody = {
        patientId: uuidField(body, 'patient_id'),
        laboratoryId: uuidField(body, 'laboratory_id'),
        testName: stringField(body, 'test_name', { max: 240 }),
        status,
      };
    }
    next();
  } catch (error) {
    next(error);
  }
}
