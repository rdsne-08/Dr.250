import { createMedicalRecord, getMedicalRecords } from '../services/medical-record.service.js';

export async function listMedicalRecords(request, response) {
  const records = await getMedicalRecords(request.user, request.validatedParams.patientId);
  response.status(200).json({ records });
}

export async function addMedicalRecord(request, response) {
  const record = await createMedicalRecord(request.user, request.validatedBody);
  response.status(201).json({ record });
}
