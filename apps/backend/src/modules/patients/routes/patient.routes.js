import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { accessLogs, prescriptions, profile, records, updateCountry } from '../controllers/patient.controller.js';
import { validateCountry } from '../validators/patient.validator.js';
import { getPracticeOptions } from '../../doctors/services/practice-options.js';
import { sendSuccess } from '../../../middleware/response.js';

export const patientRouter = Router();

patientRouter.use(authenticate, requireRole('PATIENT'));
patientRouter.get('/profile', profile);
patientRouter.patch('/profile/country', validateCountry, updateCountry);
patientRouter.get('/countries', (_request, response) => {
  sendSuccess(response, { countries: getPracticeOptions().countries });
});
patientRouter.get('/records', records);
patientRouter.get('/prescriptions', prescriptions);

patientRouter.get('/access-logs', accessLogs);
