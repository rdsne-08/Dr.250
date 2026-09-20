import { apiClient } from './apiClient.js';

const endpoints = Object.freeze({
  profile: '/api/doctors/profile',
  patients: '/api/doctors/patients',
  prescriptions: '/api/doctors/prescriptions',
  sessions: '/api/doctors/sessions',
});

function localized(value) {
  const text = value || '—';
  return { en: text, bn: text };
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthOffset = today.getMonth() - birthDate.getMonth();
  if (monthOffset < 0 || (monthOffset === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(0, age);
}

function localizedGender(gender) {
  const values = {
    FEMALE: { en: 'Female', bn: 'নারী' },
    MALE: { en: 'Male', bn: 'পুরুষ' },
    OTHER: { en: 'Other', bn: 'অন্যান্য' },
    PREFER_NOT_TO_SAY: { en: 'Not specified', bn: 'উল্লেখ করা হয়নি' },
  };
  return values[gender] ?? localized('—');
}

function formatDate(value) {
  if (!value) return localized('—');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localized(value);
  return {
    en: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date),
    bn: new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium' }).format(date),
  };
}

function adaptPatient(patient) {
  const lastAccess = formatDate(patient.last_accessed_at);
  return {
    id: patient.id,
    name: localized(patient.full_name),
    age: calculateAge(patient.date_of_birth),
    sex: localizedGender(patient.gender),
    category: 'followup',
    priority: 'stable',
    lastVisit: lastAccess.en,
    summary: {
      en: 'This patient has granted active access to their protected health information.',
      bn: 'এই রোগী তাঁর সুরক্ষিত স্বাস্থ্যতথ্যে সক্রিয় অ্যাক্সেস দিয়েছেন।',
    },
    vitals: { bloodPressure: '—', pulse: '—', bloodGroup: patient.blood_group ?? '—' },
    flags: [],
    history: patient.last_accessed_at
      ? [{
          date: lastAccess,
          title: localized('Secure record access'),
          detail: localized('Patient-authorized access session was used.'),
        }]
      : [],
  };
}

async function getDashboard() {
  const [profilePayload, patientsPayload, sessionsPayload] = await Promise.all([
    apiClient.get(endpoints.profile),
    apiClient.get(endpoints.patients),
    apiClient.get(endpoints.sessions),
  ]);
  const doctor = profilePayload.doctor;
  const patients = patientsPayload.patients ?? [];
  const sessions = sessionsPayload.sessions ?? [];
  const activeSessions = sessions.filter(
    (session) => !session.revoked_at && new Date(session.expires_at) > new Date(),
  );

  return {
    doctor: {
      name: localized(doctor.full_name),
      id: doctor.id,
      specialty: localized(doctor.specialization),
      qualification: doctor.license_number,
      hospital: doctor.email,
      availability: 'available',
    },
    stats: [
      { id: 'patients', value: patients.length, trend: '' },
      { id: 'reports', value: 0, trend: '' },
      { id: 'consultations', value: activeSessions.length, trend: '' },
    ],
    appointments: [],
    patients: patients.map(adaptPatient),
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
  getAppointments: async () => [],
  getDashboard,
  getPatients: async () => (await apiClient.get(endpoints.patients)).patients ?? [],
  getProfile: async () => (await apiClient.get(endpoints.profile)).doctor,
  getSessions: async () => (await apiClient.get(endpoints.sessions)).sessions ?? [],
});
