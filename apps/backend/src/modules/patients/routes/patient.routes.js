import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { accessLogs, prescriptions, profile, records } from '../controllers/patient.controller.js';

export const patientRouter = Router();

patientRouter.use(authenticate, requireRole('PATIENT'));
patientRouter.get('/profile', profile);
patientRouter.get('/records', records);
patientRouter.get('/prescriptions', prescriptions);

patientRouter.get('/access-logs', accessLogs);
