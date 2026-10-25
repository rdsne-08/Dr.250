import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import {
  createPrescription,
  patients,
  profile,
  sessions,
} from '../controllers/doctor.controller.js';
import { requireVerifiedDoctor } from '../middleware/verified-doctor.js';
import { validateCreatePrescription } from '../validators/doctor.validator.js';

export const doctorRouter = Router();

doctorRouter.use(authenticate, requireRole('DOCTOR'));
doctorRouter.get('/profile', profile);
doctorRouter.use(requireVerifiedDoctor);
doctorRouter.get('/patients', patients);
doctorRouter.get('/sessions', sessions);
doctorRouter.post('/prescriptions', validateCreatePrescription, createPrescription);
