import { doctorData } from '../portals/doctor/data/doctorData.js';
import { mockResponse } from './mockService.js';

export const doctorService = Object.freeze({
  getDashboard: (options) => mockResponse(doctorData, options),
  getAppointments: (options) => mockResponse(doctorData.appointments, options),
  getPatients: (options) => mockResponse(doctorData.patients, options),
});
