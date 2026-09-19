import { labData } from '../portals/lab/data/labData.js';
import { MockServiceError, mockResponse } from './mockService.js';

export const labService = Object.freeze({
  getDashboard: (options) => mockResponse(labData, options),
  getPendingTests: (options) =>
    mockResponse(labData.tests.filter((test) => test.status === 'pending'), options),
  getReports: (options) => mockResponse(labData.reports, options),
  uploadReport: async ({ file, patientId, testType }, options) => {
    if (!file || !patientId?.trim() || !testType) {
      throw new MockServiceError('File, patient ID, and test type are required.', 'INVALID_REPORT');
    }

    return mockResponse(
      { id: `MOCK-RPT-${Date.now()}`, fileName: file.name, patientId, testType },
      options,
    );
  },
});
