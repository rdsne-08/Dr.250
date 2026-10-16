export const patientData = Object.freeze({
  patient: {
    name: { en: 'Riddhi Das', bn: 'ঋদ্ধি দাস' },
    id: 'DR250-2048',
    bloodGroup: 'O+',
    activeMedicines: 3,
    nextCheckup: '2026-10-05',
  },
  overview: [
    { id: 'records', value: 12, detailValue: { en: '14 Sep 2026', bn: '১৪ সেপ্টেম্বর ২০২৬' } },
    {
      id: 'visits',
      value: 4,
      detailValue: { en: 'Dr. Farhana Rahman', bn: 'ডা. ফারহানা রহমান' },
    },
    { id: 'reports', value: 6, status: 'ready' },
    { id: 'prescriptions', value: 3, status: 'active' },
  ],
  timeline: [
    { id: 'labUploaded', date: 'today', type: 'report' },
    { id: 'doctorConsultation', date: 'sep12', type: 'visit' },
    { id: 'prescriptionUpdated', date: 'aug28', type: 'prescription' },
    { id: 'recordAdded', date: 'aug03', type: 'record' },
  ],
  quickActions: ['uploadRecord', 'findDoctor', 'viewReports', 'createQr'],
  doctorAccess: {
    activeSessions: 1,
    doctorName: { en: 'Dr. Farhana Rahman', bn: 'ডা. ফারহানা রহমান' },
    specialty: 'internalMedicine',
    expiresAt: { en: '4:30 PM', bn: 'বিকেল ৪:৩০' },
  },
});
