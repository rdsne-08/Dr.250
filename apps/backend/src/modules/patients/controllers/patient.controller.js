import {
  getOwnMedicalRecords,
  getOwnPrescriptions,
  getOwnReports,
  getPatientProfile,
} from '../services/patient.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function profile(request, response) {
  sendSuccess(response, { patient: await getPatientProfile(request.user.id) });
}

export async function records(request, response) {
  sendSuccess(response, { records: await getOwnMedicalRecords(request.user.id) });
}

export async function prescriptions(request, response) {
  sendSuccess(response, { prescriptions: await getOwnPrescriptions(request.user.id) });
}

export async function reports(request, response) {
  sendSuccess(response, { reports: await getOwnReports(request.user.id) });
}
