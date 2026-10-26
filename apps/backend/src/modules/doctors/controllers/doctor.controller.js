import { createDoctorPrescription } from '../../prescriptions/services/prescription.service.js';
import { getDoctorSessions } from '../../sessions/services/session.service.js';
import { sendSuccess } from '../../../middleware/response.js';
import { HttpError } from '../../../middleware/http-error.js';
import {
  findDoctorByUserId,
  getAuthorizedPatients,
  getTodayAvailability,
  saveTodayAvailability,
  updateProfessionalProfile,
} from '../services/doctor.service.js';
import { getPracticeOptions } from '../services/practice-options.js';

export async function profile(request, response) {
  const doctor = await findDoctorByUserId(request.user.id);
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found.');
  }

  sendSuccess(response, { doctor });
}

export async function profileOptions(_request, response) {
  sendSuccess(response, getPracticeOptions());
}

export async function updateProfile(request, response) {
  const doctor = await updateProfessionalProfile(request.user.id, request.validatedBody);
  sendSuccess(response, { doctor });
}

export async function todayAvailability(request, response) {
  sendSuccess(response, { availability: await getTodayAvailability(request.user.id) });
}

export async function updateTodayAvailability(request, response) {
  sendSuccess(response, { availability: await saveTodayAvailability(request.user.id, request.validatedBody) });
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
