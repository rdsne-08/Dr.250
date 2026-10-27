import { getOwnAccessLogs } from '../../sessions/services/audit.service.js';
import {
  getOwnMedicalRecords,
  getOwnPrescriptions,
  getPatientProfile,
  updatePatientCountry,
} from '../services/patient.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function profile(request, response) {
  sendSuccess(response, { patient: await getPatientProfile(request.user.id) });
}

export async function updateCountry(request, response) {
  sendSuccess(response, { patient: await updatePatientCountry(request.user.id, request.validatedCountry) });
}

export async function records(request, response) {
  sendSuccess(response, { records: await getOwnMedicalRecords(request.user.id) });
}

export async function prescriptions(request, response) {
  sendSuccess(response, { prescriptions: await getOwnPrescriptions(request.user.id) });
}

export async function accessLogs(request, response) {
  sendSuccess(response, { logs: await getOwnAccessLogs(request.user.id) });
}
