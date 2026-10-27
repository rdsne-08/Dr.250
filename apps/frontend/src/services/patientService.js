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
  createRecord: async ({ patientId, diagnosis, notes }) => (await apiClient.post('/api/medical-records', {
    patient_id: patientId, diagnosis, notes,
  })).record,
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
  getCountries: async () => (await apiClient.get('/api/patients/countries')).countries ?? [],
  updateCountry: async countryCode => (await apiClient.patch('/api/patients/profile/country', {
    country_code: countryCode,
  })).patient,
  discoverDoctors: async () => apiClient.get('/api/appointments/doctors'),
  getAppointments: async () => (await apiClient.get('/api/appointments')).appointments ?? [],
  bookAppointment: async (doctorId, localDate) => (await apiClient.post('/api/appointments', {
    doctor_id: doctorId, local_date: localDate,
  })).appointment,
  cancelAppointment: async id => (await apiClient.post(`/api/appointments/${id}/cancel`, {})).appointment,
});
