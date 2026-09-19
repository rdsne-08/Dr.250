import {
  getOwnMedicalRecords,
  getOwnPrescriptions,
  getOwnReports,
  getPatientProfile,
} from '../services/patient.service.js';

export async function profile(request, response) {
  response.status(200).json({ patient: await getPatientProfile(request.user.id) });
}

export async function records(request, response) {
  response.status(200).json({ records: await getOwnMedicalRecords(request.user.id) });
}

export async function prescriptions(request, response) {
  response.status(200).json({ prescriptions: await getOwnPrescriptions(request.user.id) });
}

export async function reports(request, response) {
  response.status(200).json({ reports: await getOwnReports(request.user.id) });
}
