import { apiClient } from './apiClient.js';

const endpoints = Object.freeze({
  profile: '/api/patients/profile',
  records: '/api/patients/records',
  prescriptions: '/api/patients/prescriptions',
  reports: '/api/patients/reports',
  sessions: '/api/sessions',
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
    reports[0] && { id: 'labUploaded', date: 'today', type: 'report', at: reports[0].created_at },
    prescriptions[0] && {
      id: 'prescriptionUpdated',
      date: 'aug28',
      type: 'prescription',
      at: prescriptions[0].created_at,
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
    (session) => !session.revoked_at && new Date(session.expires_at) > new Date(),
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
    assistant: { suggestedPrompt: 'explainBloodTest' },
  };
}

export const patientService = Object.freeze({
  getDashboard,
  getMedicalRecords: async () => (await apiClient.get(endpoints.records)).records ?? [],
  getPrescriptions: async () => (await apiClient.get(endpoints.prescriptions)).prescriptions ?? [],
  getProfile: async () => (await apiClient.get(endpoints.profile)).patient,
  getReports: async () => (await apiClient.get(endpoints.reports)).reports ?? [],
});
