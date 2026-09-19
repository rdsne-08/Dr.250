import { enumField, requireJsonObject, uuidField } from '../../../validation/request.js';

export function validateVerification(request, _response, next) {
  try {
    const body = requireJsonObject(request.body);
    request.validatedParams = { id: uuidField(request.params, 'id') };
    request.validatedBody = {
      entityType: enumField(body, 'entity_type', ['DOCTOR', 'LAB']),
      status: enumField(body, 'status', ['VERIFIED', 'REJECTED', 'SUSPENDED']),
    };
    next();
  } catch (error) {
    next(error);
  }
}
