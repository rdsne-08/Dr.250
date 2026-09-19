import { createMedicalRecord, getMedicalRecords } from '../services/medical-record.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function listMedicalRecords(request, response) {
  const records = await getMedicalRecords(request.user, request.validatedParams.patientId);
  sendSuccess(response, { records });
}

export async function addMedicalRecord(request, response) {
  const record = await createMedicalRecord(request.user, request.validatedBody);
  sendSuccess(response, { record }, 201);
}
