import { apiClient } from './apiClient.js';

const endpoints = Object.freeze({
  profile: '/api/patients/profile',
  records: '/api/patients/records',
  prescriptions: '/api/patients/prescriptions',
  reports: '/api/patients/reports',
  sessions: '/api/sessions',
  verifiedDoctors: '/api/sessions/doctors',
  accessLogs: '/api/patients/access-logs',
});

function localized(value) {
  const text = value || '—';
  return { en: text, bn: text };
}

function localizedDate(value) {
  if (!value) return localized('Unavailable');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localized('Unavailable');
  return {
    en: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date),
    bn: new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium' }).format(date),
  };
}

function latestDate(items) {
  return items.reduce((latest, item) => {
    const value = item.created_at ?? item.date;
    return value && (!latest || new Date(value) > new Date(latest)) ? value : latest;
  }, null);
}

function buildTimeline(records, prescriptions, reports) {
  const candidates = [
    ...reports.map(report => ({
      id: `report-${report.id}`,
      date: localizedDate(report.updated_at ?? report.created_at),
      type: 'report',
      at: report.updated_at ?? report.created_at,
      title: report.test_name ? `${report.test_name} report` : 'Lab report',
      detail: report.status === 'COMPLETED'
        ? `Completed${report.lab_name ? ` by ${report.lab_name}` : ''}. The report is ready in your health record.`
        : report.status ? `Current laboratory status: ${report.status}.` : 'Status unavailable.',
    })),
    ...prescriptions.map(prescription => ({
      id: `prescription-${prescription.id}`,
      date: localizedDate(prescription.created_at),
      type: 'prescription',
      at: prescription.created_at,
      title: prescription.medicine ? `Prescription: ${prescription.medicine}` : 'Prescription',
      detail: [
        prescription.dosage,
        prescription.duration,
        prescription.instructions,
      ].filter(Boolean).join(' · '),
    })),
    ...records.map(record => ({
      id: `record-${record.id}`,
      date: localizedDate(record.created_at),
      type: 'record',
      at: record.created_at,
      title: record.title || 'Medical record',
      detail: record.description || record.record_type || 'No description available.',
    })),
  ];

  return candidates.sort((left, right) =>
    (Date.parse(right.at) || 0) - (Date.parse(left.at) || 0));
}

async function getDashboard() {
  const [profilePayload, recordsPayload, prescriptionsPayload, reportsPayload, sessionsPayload] =
    await Promise.all([
      apiClient.get(endpoints.profile),
      apiClient.get(endpoints.records),
      apiClient.get(endpoints.prescriptions),
      apiClient.get(endpoints.reports),
      apiClient.get(endpoints.sessions),
    ]);
  const patient = profilePayload.patient;
  const records = recordsPayload.records ?? [];
  const prescriptions = prescriptionsPayload.prescriptions ?? [];
  const reports = reportsPayload.reports ?? [];
  const sessions = sessionsPayload.sessions ?? [];
  const activeSessions = sessions.filter(
    (session) => session.status === 'ACTIVE' && !session.revoked_at
      && new Date(session.expires_at) > new Date(),
  );
  const currentSession = activeSessions[0];

  return {
    patient: {
      name: localized(patient.full_name),
      id: patient.id,
      bloodGroup: patient.blood_group ?? '—',
      activeMedicines: prescriptions.length,
      nextCheckup: null,
    },
    overview: [
      { id: 'records', value: records.length, detailValue: localizedDate(latestDate(records)) },
      { id: 'reports', value: reports.length,
        status: reports.some(report => report.status === 'COMPLETED') ? 'ready' : undefined },
      {
        id: 'prescriptions',
        value: prescriptions.length,
        status: prescriptions.length ? 'active' : undefined,
      },
    ],
    timeline: buildTimeline(records, prescriptions, reports),
    quickActions: ['uploadRecord', 'findDoctor', 'viewReports', 'createQr'],
    doctorAccess: {
      activeSessions: activeSessions.length,
      doctorName: localized(currentSession?.doctor_name ?? 'No active doctor'),
      specialty: 'internalMedicine',
      expiresAt: localizedDate(currentSession?.expires_at),
    },
  };
}

export const patientService = Object.freeze({
  createDoctorAccess: async (doctorId) => (await apiClient.post(endpoints.sessions, {
    doctor_id: doctorId,
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  })).session,
  getDashboard,
  getAccessLogs: async () => (await apiClient.get(endpoints.accessLogs)).logs ?? [],
  getMedicalRecords: async () => (await apiClient.get(endpoints.records)).records ?? [],
  getPrescriptions: async () => (await apiClient.get(endpoints.prescriptions)).prescriptions ?? [],
  getProfile: async () => (await apiClient.get(endpoints.profile)).patient,
  getReports: async () => (await apiClient.get(endpoints.reports)).reports ?? [],
  getSessions: async () => (await apiClient.get(endpoints.sessions)).sessions ?? [],
  getVerifiedDoctors: async () => (await apiClient.get(endpoints.verifiedDoctors)).doctors ?? [],
  revokeDoctorAccess: async (sessionId) => (await apiClient.patch(
    `/api/sessions/${sessionId}/revoke`, {},
  )).session,
});
