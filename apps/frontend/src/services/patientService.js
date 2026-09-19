import { patientData } from '../portals/patient/data/patientData.js';
import { mockResponse } from './mockService.js';

export const patientService = Object.freeze({
  getDashboard: (options) => mockResponse(patientData, options),
  getMedicalRecords: (options) =>
    mockResponse(patientData.timeline.filter((event) => event.type === 'record'), options),
  getPrescriptions: (options) =>
    mockResponse(patientData.timeline.filter((event) => event.type === 'prescription'), options),
  getReports: (options) =>
    mockResponse(patientData.timeline.filter((event) => event.type === 'report'), options),
});
