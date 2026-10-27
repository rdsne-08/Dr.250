import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { accessLogs, prescriptions, profile, records, updateCountry } from '../controllers/patient.controller.js';
import { validateCountry } from '../validators/patient.validator.js';
import { getPracticeOptions } from '../../doctors/services/practice-options.js';
import { sendSuccess } from '../../../middleware/response.js';
import { validateHealthMeasurement, validateHealthProfile } from '../validators/health-profile.validator.js';
import { addOwnMeasurement, getHealthProfile, saveOwnHealthProfile, updateOwnMeasurement } from '../services/health-profile.service.js';
import { getPatientProfile } from '../services/patient.service.js';
import { HttpError } from '../../../middleware/http-error.js';

export const patientRouter = Router();

patientRouter.use(authenticate, requireRole('PATIENT'));
patientRouter.get('/profile', profile);
patientRouter.get('/health-profile', async (request, response) => {
  const patient = await getPatientProfile(request.user.id);
  sendSuccess(response, { health: await getHealthProfile(request.user, patient.id) });
});
patientRouter.put('/health-profile', validateHealthProfile, async (request, response) => {
  sendSuccess(response, { profile: await saveOwnHealthProfile(request.user.id, request.validatedHealthProfile) });
});
patientRouter.post('/health-profile/measurements', validateHealthMeasurement, async (request, response) => {
  sendSuccess(response, { measurement: await addOwnMeasurement(request.user.id, request.validatedHealthMeasurement) }, 201);
});
patientRouter.patch('/health-profile/measurements/:measurementId', validateHealthMeasurement, async (request, response) => {
  const id = request.params.measurementId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, 'A valid measurement is required.');
  }
  sendSuccess(response, { measurement: await updateOwnMeasurement(request.user.id, id, request.validatedHealthMeasurement) });
});
patientRouter.patch('/profile/country', validateCountry, updateCountry);
patientRouter.get('/countries', (_request, response) => {
  sendSuccess(response, { countries: getPracticeOptions().countries });
});
patientRouter.get('/records', records);
patientRouter.get('/prescriptions', prescriptions);

patientRouter.get('/access-logs', accessLogs);
