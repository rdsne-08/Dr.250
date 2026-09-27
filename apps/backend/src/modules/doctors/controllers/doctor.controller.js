import { createDoctorPrescription } from '../../prescriptions/services/prescription.service.js';
import { getDoctorSessions } from '../../sessions/services/session.service.js';
import { sendSuccess } from '../../../middleware/response.js';
import { HttpError } from '../../../middleware/http-error.js';
import {
  findDoctorByUserId,
  getAuthorizedPatients,
  getAvailableLaboratories,
} from '../services/doctor.service.js';

export async function profile(request, response) {
  const doctor = await findDoctorByUserId(request.user.id);
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found.');
  }

  sendSuccess(response, { doctor });
}

export async function patients(request, response) {
  sendSuccess(response, { patients: await getAuthorizedPatients(request.doctor.id) });
}

export async function sessions(request, response) {
  sendSuccess(response, { sessions: await getDoctorSessions(request.doctor.id) });
}

export async function laboratories(_request, response) {
  sendSuccess(response, { laboratories: await getAvailableLaboratories() });
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
