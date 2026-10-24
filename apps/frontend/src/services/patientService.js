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
  if (!value) return localized('—');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localized(value);
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
    reports[0] && {
      id: 'labUploaded',
      date: localizedDate(reports[0].updated_at ?? reports[0].created_at).en,
      type: 'report',
      at: reports[0].updated_at ?? reports[0].created_at,
      title: `${reports[0].test_name} report`,
      detail: reports[0].status === 'COMPLETED'
        ? `Completed by ${reports[0].lab_name}. The report is ready in your health record.`
        : `Current laboratory status: ${reports[0].status}.`,
      fileUrl: reports[0].file_url,
      reportId: reports[0].id,
    },
    prescriptions[0] && {
      id: 'prescriptionUpdated',
      date: localizedDate(prescriptions[0].created_at).en,
      type: 'prescription',
      at: prescriptions[0].created_at,
      title: `Prescription: ${prescriptions[0].medicine}`,
      detail: [
        prescriptions[0].dosage,
        prescriptions[0].duration,
        prescriptions[0].instructions,
      ].filter(Boolean).join(' · '),
    },
    records[0] && { id: 'recordAdded', date: 'aug03', type: 'record', at: records[0].created_at },
  ].filter(Boolean);

  return candidates.sort((left, right) => new Date(right.at) - new Date(left.at));
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
      { id: 'visits', value: 0, detailValue: localized('—') },
      { id: 'reports', value: reports.length, status: reports.length ? 'ready' : undefined },
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
