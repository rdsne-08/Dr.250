import { apiClient } from './apiClient.js';

const endpoints = Object.freeze({
  profile: '/api/doctors/profile',
  patients: '/api/doctors/patients',
  prescriptions: '/api/doctors/prescriptions',
  medicalRecords: patientId => `/api/medical-records/${patientId}`,
  patientPrescriptions: patientId => `/api/prescriptions/${patientId}`,
});

async function getDashboard() {
  const { doctor } = await apiClient.get(endpoints.profile);
  if (doctor.verification_status !== 'VERIFIED') return { doctor, patients: [] };
  const { patients = [] } = await apiClient.get(endpoints.patients);
  return {
    doctor,
    patients: await Promise.all(patients.map(async patient => {
      const [records, prescriptions] = await Promise.all([
        apiClient.get(endpoints.medicalRecords(patient.id)),
        apiClient.get(endpoints.patientPrescriptions(patient.id)),
      ]);
      return { ...patient, records: records.records ?? [],
        prescriptions: prescriptions.prescriptions ?? [] };
    })),
  };
}

async function createPrescription(details) {
  const payload = await apiClient.post(endpoints.prescriptions, {
    patient_id: details.patientId ?? details.patient_id,
    medicine: details.medicine,
    dosage: details.dosage,
    duration: details.duration,
    instructions: details.instructions,
  });
  return payload.prescription;
}

export const doctorService = Object.freeze({
  createPrescription,
  getDashboard,
  getPatients: async () => (await apiClient.get(endpoints.patients)).patients ?? [],
  getProfile: async () => (await apiClient.get(endpoints.profile)).doctor,
  getProfileOptions: async () => apiClient.get('/api/doctors/profile-options'),
  updateProfile: async details => (await apiClient.put(endpoints.profile, details)).doctor,
  getTodayAvailability: async () => (await apiClient.get('/api/doctors/availability/today')).availability,
  saveTodayAvailability: async details => (await apiClient.put('/api/doctors/availability/today', details)).availability,
  getTodayQueue: async () => (await apiClient.get('/api/doctors/queue/today')).queue,
  decideCare: async (id, action) => (await apiClient.post(`/api/doctors/consultations/${id}/${action}`, {})).appointment,
  getConsultation: async id => (await apiClient.get(`/api/doctors/consultations/${id}`)).consultation,
});
