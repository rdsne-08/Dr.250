import { createDoctorPrescription } from '../../prescriptions/services/prescription.service.js';
import { getDoctorSessions } from '../../sessions/services/session.service.js';
import { getAuthorizedPatients } from '../services/doctor.service.js';

export async function profile(request, response) {
  response.status(200).json({ doctor: request.doctor });
}

export async function patients(request, response) {
  response.status(200).json({ patients: await getAuthorizedPatients(request.doctor.id) });
}

export async function sessions(request, response) {
  response.status(200).json({ sessions: await getDoctorSessions(request.doctor.id) });
}

export async function createPrescription(request, response) {
  const prescription = await createDoctorPrescription(
    request.user,
    request.validatedBody,
    undefined,
    request.doctor,
  );
  response.status(201).json({ prescription });
}
