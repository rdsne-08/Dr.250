import { apiClient } from './apiClient.js';

const endpoints = Object.freeze({
  profile: '/api/doctors/profile',
  patients: '/api/doctors/patients',
  prescriptions: '/api/doctors/prescriptions',
  sessions: '/api/doctors/sessions',
  laboratories: '/api/doctors/laboratories',
  reportRequests: '/api/reports',
  medicalRecords: (patientId) => `/api/medical-records/${patientId}`,
  patientPrescriptions: (patientId) => `/api/prescriptions/${patientId}`,
  reports: (patientId) => `/api/reports/${patientId}`,
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

function adaptPatient(patient, records = {}) {
  const lastAccess = formatDate(patient.last_accessed_at);
  const history = [
    ...(records.medical ?? []).map((record) => ({
      at: record.date,
      title: record.diagnosis || 'Medical record',
      detail: record.notes,
    })),
    ...(records.prescriptions ?? []).map((prescription) => ({
      at: prescription.created_at,
      title: `Prescription: ${prescription.medicine}`,
      detail: [prescription.dosage, prescription.duration, prescription.instructions]
        .filter(Boolean)
        .join(' Â· '),
    })),
    ...(records.reports ?? []).map((report) => ({
      at: report.created_at,
      title: `Lab report: ${report.test_name}`,
      detail: report.status,
    })),
  ]
    .sort((left, right) => new Date(right.at) - new Date(left.at))
    .map((item) => ({
      date: formatDate(item.at),
      title: localized(item.title),
      detail: localized(item.detail),
    }));

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
    history: history.length ? history : patient.last_accessed_at
      ? [{
          date: lastAccess,
          title: localized('Secure record access'),
          detail: localized('Patient-authorized access session was used.'),
        }]
      : [],
  };
}

async function getDashboard() {
  const profilePayload = await apiClient.get(endpoints.profile);
  const doctor = profilePayload.doctor;
  const dashboard = {
    doctor: {
      name: localized(doctor.full_name),
      id: doctor.id,
      specialty: localized(doctor.specialization),
      qualification: doctor.license_number,
      hospital: doctor.email,
      availability: 'available',
    },
    verificationStatus: doctor.verification_status,
    stats: [
      { id: 'patients', value: 0, trend: '' },
      { id: 'reports', value: 0, trend: '' },
      { id: 'consultations', value: 0, trend: '' },
    ],
    appointments: [],
    laboratories: [],
    patients: [],
  };

  if (doctor.verification_status !== 'VERIFIED') return dashboard;

  const [patientsPayload, sessionsPayload, laboratoriesPayload] = await Promise.all([
    apiClient.get(endpoints.patients),
    apiClient.get(endpoints.sessions),
    apiClient.get(endpoints.laboratories),
  ]);
  const patients = patientsPayload.patients ?? [];
  const sessions = sessionsPayload.sessions ?? [];
  const patientRecords = await Promise.all(
    patients.map(async (patient) => {
      const [medicalPayload, prescriptionsPayload, reportsPayload] = await Promise.all([
        apiClient.get(endpoints.medicalRecords(patient.id)),
        apiClient.get(endpoints.patientPrescriptions(patient.id)),
        apiClient.get(endpoints.reports(patient.id)),
      ]);
      return {
        medical: medicalPayload.records ?? [],
        prescriptions: prescriptionsPayload.prescriptions ?? [],
        reports: reportsPayload.reports ?? [],
      };
    }),
  );
  const activeSessions = sessions.filter(
    (session) => !session.revoked_at && new Date(session.expires_at) > new Date(),
  );

  return {
    ...dashboard,
    stats: [
      { id: 'patients', value: patients.length, trend: '' },
      {
        id: 'reports',
        value: patientRecords.reduce((total, record) => total + record.reports.length, 0),
        trend: '',
      },
      { id: 'consultations', value: activeSessions.length, trend: '' },
    ],
    laboratories: (laboratoriesPayload.laboratories ?? []).map((laboratory) => ({
      id: laboratory.id,
      name: localized(laboratory.lab_name),
      licenseNumber: laboratory.license_number,
    })),
    patients: patients.map((patient, index) => adaptPatient(patient, patientRecords[index])),
  };
}

async function createLabRequest(details) {
  const payload = await apiClient.post(endpoints.reportRequests, {
    patient_id: details.patientId,
    laboratory_id: details.laboratoryId,
    test_name: details.testName,
    status: 'REQUESTED',
  });
  return payload.report;
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
  createLabRequest,
  createPrescription,
  getAppointments: async () => [],
  getDashboard,
  getPatients: async () => (await apiClient.get(endpoints.patients)).patients ?? [],
  getProfile: async () => (await apiClient.get(endpoints.profile)).doctor,
  getSessions: async () => (await apiClient.get(endpoints.sessions)).sessions ?? [],
  redeemAccess: async (credential) => (await apiClient.post('/api/sessions/redeem', {
    credential,
  })).session,
});
