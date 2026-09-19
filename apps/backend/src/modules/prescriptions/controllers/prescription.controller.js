import {
  createDoctorPrescription,
  getPatientPrescriptions,
} from '../services/prescription.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function listPrescriptions(request, response) {
  const prescriptions = await getPatientPrescriptions(
    request.user,
    request.validatedParams.patientId,
  );
  sendSuccess(response, { prescriptions });
}

export async function createPrescription(request, response) {
  const prescription = await createDoctorPrescription(
    request.user,
    request.validatedBody,
    undefined,
    request.doctor,
  );
  sendSuccess(response, { prescription }, 201);
}
