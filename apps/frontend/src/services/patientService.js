import { apiClient } from './apiClient.js';

const endpoints = Object.freeze({
  profile: '/api/patients/profile',
  records: '/api/patients/records',
  prescriptions: '/api/patients/prescriptions',
  sessions: '/api/sessions',
  verifiedDoctors: '/api/sessions/doctors',
  accessLogs: '/api/patients/access-logs',
});

async function getDashboard() {
  const [profile, records, prescriptions] = await Promise.all([
    apiClient.get(endpoints.profile),
    apiClient.get(endpoints.records),
    apiClient.get(endpoints.prescriptions),
  ]);
  return { patient: profile.patient, records: records.records ?? [],
    prescriptions: prescriptions.prescriptions ?? [] };
}

export const patientService = Object.freeze({
  getDashboard,
  createDoctorAccess: async doctorId => (await apiClient.post(endpoints.sessions, {
    doctor_id: doctorId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
  })).session,
  getAccessLogs: async () => (await apiClient.get(endpoints.accessLogs)).logs ?? [],
  getSessions: async () => (await apiClient.get(endpoints.sessions)).sessions ?? [],
  getVerifiedDoctors: async () => (await apiClient.get(endpoints.verifiedDoctors)).doctors ?? [],
  revokeDoctorAccess: async sessionId => (await apiClient.patch(
    `/api/sessions/${sessionId}/revoke`, {},
  )).session,
});
