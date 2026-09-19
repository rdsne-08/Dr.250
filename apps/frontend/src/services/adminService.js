import { adminData } from '../portals/admin/data/adminData.js';
import { mockResponse } from './mockService.js';

export const adminService = Object.freeze({
  getDashboard: (options) => mockResponse(adminData, options),
  getUsers: (options) => mockResponse(adminData.users, options),
  getDoctors: (options) => mockResponse(adminData.doctors, options),
  getLaboratories: (options) => mockResponse(adminData.labs, options),
  getVerificationRequests: (options) => mockResponse(adminData.verificationRequests, options),
});
