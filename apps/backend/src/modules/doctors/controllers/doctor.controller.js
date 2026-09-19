import { createDoctorPrescription } from '../../prescriptions/services/prescription.service.js';
import { getDoctorSessions } from '../../sessions/services/session.service.js';
import { sendSuccess } from '../../../middleware/response.js';
import { getAuthorizedPatients } from '../services/doctor.service.js';

export async function profile(request, response) {
  sendSuccess(response, { doctor: request.doctor });
}

export async function patients(request, response) {
  sendSuccess(response, { patients: await getAuthorizedPatients(request.doctor.id) });
}

export async function sessions(request, response) {
  sendSuccess(response, { sessions: await getDoctorSessions(request.doctor.id) });
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
