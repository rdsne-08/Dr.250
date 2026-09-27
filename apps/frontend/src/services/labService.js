import { ApiError, apiClient } from './apiClient.js';

const endpoints = Object.freeze({
  profile: '/api/labs/profile',
  reports: '/api/labs/reports',
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
    en: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date),
    bn: new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(date),
  };
}

function displayStatus(status) {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'PROCESSING' || status === 'SAMPLE_COLLECTED') return 'processing';
  return 'pending';
}

function shortTestName(name) {
  const words = name.trim().split(/\s+/);
  return words.length > 1
    ? words.map((word) => word[0]).join('').slice(0, 5).toUpperCase()
    : name.slice(0, 8);
}

function adaptDashboard(laboratory, sourceReports) {
  const reports = sourceReports.filter((report) => report.status !== 'CANCELLED');
  const patients = Array.from(new Map(reports.map((report) => [
    report.patient_id,
    {
      id: report.patient_id,
      name: localized(report.patient_name),
      age: 0,
      sex: localized('—'),
    },
  ])).values());
  const doctors = Array.from(new Map(reports.filter((report) => report.requested_by_doctor_id).map(
    (report) => [
      report.requested_by_doctor_id,
      {
        id: report.requested_by_doctor_id,
        name: localized(report.requested_by_doctor ?? 'Dr.250 doctor'),
        specialty: localized('—'),
      },
    ],
  )).values());
  const patientById = Object.fromEntries(patients.map((patient) => [patient.id, patient]));
  const doctorById = Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor]));
  const tests = reports.map((report) => ({
    id: report.id,
    patientId: report.patient_id,
    doctorId: report.requested_by_doctor_id,
    name: localized(report.test_name),
    shortName: shortTestName(report.test_name),
    requestedAt: localizedDate(report.created_at),
    dueAt: localizedDate(report.updated_at),
    status: displayStatus(report.status),
    rawStatus: report.status,
    priority: 'routine',
  }));
  const testById = Object.fromEntries(tests.map((test) => [test.id, test]));
  const completed = reports.filter((report) => report.status === 'COMPLETED');
  const pending = reports.filter((report) => report.status !== 'COMPLETED');

  return {
    laboratory: {
      name: localized(laboratory.lab_name),
      id: laboratory.id,
      branch: localized(laboratory.email),
      verification: laboratory.verification_status.toLowerCase(),
    },
    workload: { pending: pending.length, completed: completed.length, samples: reports.length },
    overview: [
      { id: 'pending', value: pending.length, detail: pending.length },
      { id: 'completed', value: completed.length, detail: completed.length },
      { id: 'urgent', value: 0, detail: 0 },
      { id: 'patients', value: patients.length, detail: patients.length },
    ],
    patients,
    doctors,
    tests,
    reports: completed.map((report) => ({
      id: report.id,
      testId: report.id,
      patientId: report.patient_id,
      uploadedAt: localizedDate(report.updated_at),
      status: 'delivered',
    })),
    doctorRequests: pending.map((report) => ({
      id: report.id,
      doctorId: report.requested_by_doctor_id,
      patientId: report.patient_id,
      testId: report.id,
      priority: 'routine',
      doctor: doctorById[report.requested_by_doctor_id],
      patient: patientById[report.patient_id],
      test: testById[report.id],
    })).filter((request) => request.doctor && request.patient && request.test),
    reportTimeline: completed.slice(0, 5).map((report) => ({
      id: 'completed',
      time: localizedDate(report.updated_at),
      patientId: report.patient_id,
      reportId: report.id,
      patient: patientById[report.patient_id],
    })),
  };
}

async function getDashboard() {
  const [profilePayload, reportsPayload] = await Promise.all([
    apiClient.get(endpoints.profile),
    apiClient.get(endpoints.reports),
  ]);
  return adaptDashboard(profilePayload.laboratory, reportsPayload.reports ?? []);
}

async function uploadReport({ file, note, patientId, reportId, testType }) {
  const assignedReportId = reportId ?? patientId;
  if (!file || !assignedReportId?.trim() || !testType) {
    throw new ApiError('File, report ID, and test type are required.', {
      code: 'INVALID_REPORT',
    });
  }

  const form = new FormData();
  form.append('file', file);
  form.append('report_id', assignedReportId.trim());
  form.append('test_name', testType);
  form.append('status', 'COMPLETED');
  if (patientId?.trim()) form.append('patient_id', patientId.trim());
  if (note?.trim()) form.append('result', note.trim());

  const payload = await apiClient.post(endpoints.reports, form);
  return payload.report;
}

async function updateReportStatus(reportId, status) {
  const payload = await apiClient.post(endpoints.reports, {
    report_id: reportId,
    status,
  });
  return payload.report;
}

export const labService = Object.freeze({
  getDashboard,
  getPendingTests: async () => {
    const reports = (await apiClient.get(endpoints.reports)).reports ?? [];
    return reports.filter((report) => !['COMPLETED', 'CANCELLED'].includes(report.status));
  },
  getProfile: async () => (await apiClient.get(endpoints.profile)).laboratory,
  getReports: async () => (await apiClient.get(endpoints.reports)).reports ?? [],
  updateReportStatus,
  uploadReport,
});
