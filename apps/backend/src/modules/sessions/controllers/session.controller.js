import { getVerifiedDoctor } from '../../doctors/services/doctor.service.js';
import { getPatientProfile } from '../../patients/services/patient.service.js';
import {
  createPatientSession,
  getDoctorSessions,
  getPatientSessions,
  revokePatientSession,
} from '../services/session.service.js';

export async function listSessions(request, response) {
  if (request.user.role === 'DOCTOR') {
    const doctor = await getVerifiedDoctor(request.user.id);
    return response.status(200).json({ sessions: await getDoctorSessions(doctor.id) });
  }

  const patient = await getPatientProfile(request.user.id);
  return response.status(200).json({ sessions: await getPatientSessions(patient.id) });
}

export async function createSession(request, response) {
  const patient = await getPatientProfile(request.user.id);
  const session = await createPatientSession({
    patientId: patient.id,
    ...request.validatedBody,
  });
  response.status(201).json({ session });
}

export async function revokeSession(request, response) {
  const patient = await getPatientProfile(request.user.id);
  const session = await revokePatientSession(request.validatedParams.sessionId, patient.id);
  response.status(200).json({ session });
}
