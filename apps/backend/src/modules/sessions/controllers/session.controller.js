import { getVerifiedDoctor } from '../../doctors/services/doctor.service.js';
import { getPatientProfile } from '../../patients/services/patient.service.js';
import { sendSuccess } from '../../../middleware/response.js';
import {
  createPatientSession,
  getVerifiedDoctors,
  getDoctorSessions,
  getPatientSessions,
  revokePatientSession,
} from '../services/session.service.js';

export async function listSessions(request, response) {
  if (request.user.role === 'DOCTOR') {
    const doctor = await getVerifiedDoctor(request.user.id);
    return sendSuccess(response, { sessions: await getDoctorSessions(doctor.id) });
  }

  const patient = await getPatientProfile(request.user.id);
  return sendSuccess(response, { sessions: await getPatientSessions(patient.id) });
}

export async function createSession(request, response) {
  const patient = await getPatientProfile(request.user.id);
  const session = await createPatientSession({
    patientId: patient.id,
    ...request.validatedBody,
  });
  sendSuccess(response, { session }, 201);
}

export async function revokeSession(request, response) {
  const patient = await getPatientProfile(request.user.id);
  const session = await revokePatientSession(request.validatedParams.sessionId, patient.id);
  sendSuccess(response, { session });
}

export async function verifiedDoctors(_request, response) {
  sendSuccess(response, { doctors: await getVerifiedDoctors() });
}
