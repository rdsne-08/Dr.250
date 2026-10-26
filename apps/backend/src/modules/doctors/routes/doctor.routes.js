import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import {
  createPrescription,
  patients,
  profile,
  profileOptions,
  sessions,
  todayAvailability,
  updateProfile,
  updateTodayAvailability,
} from '../controllers/doctor.controller.js';
import { requireVerifiedDoctor } from '../middleware/verified-doctor.js';
import { validateCreatePrescription } from '../validators/doctor.validator.js';
import { validateProfessionalProfile, validateTodayAvailability } from '../validators/practice.validator.js';

export const doctorRouter = Router();

doctorRouter.use(authenticate, requireRole('DOCTOR'));
doctorRouter.get('/profile', profile);
doctorRouter.put('/profile', validateProfessionalProfile, updateProfile);
doctorRouter.get('/profile-options', profileOptions);
doctorRouter.get('/availability/today', todayAvailability);
doctorRouter.put('/availability/today', validateTodayAvailability, updateTodayAvailability);
doctorRouter.use(requireVerifiedDoctor);
doctorRouter.get('/patients', patients);
doctorRouter.get('/sessions', sessions);
doctorRouter.post('/prescriptions', validateCreatePrescription, createPrescription);
