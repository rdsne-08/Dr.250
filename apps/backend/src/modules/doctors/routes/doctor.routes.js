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
import { doctorTodayQueue } from '../../appointments/appointment.service.js';
import { sendSuccess } from '../../../middleware/response.js';
import { HttpError } from '../../../middleware/http-error.js';
import { activeConsultation, completeConsultation, decideCare } from '../../appointments/consultation.service.js';

export const doctorRouter = Router();

doctorRouter.use(authenticate, requireRole('DOCTOR'));
doctorRouter.get('/profile', profile);
doctorRouter.put('/profile', validateProfessionalProfile, updateProfile);
doctorRouter.get('/profile-options', profileOptions);
doctorRouter.get('/availability/today', todayAvailability);
doctorRouter.get('/queue/today', async (request, response) => {
  sendSuccess(response, { queue: await doctorTodayQueue(request.user.id) });
});
doctorRouter.get('/consultations/:appointmentId', async (request, response) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.appointmentId)) {
    throw new HttpError(400, 'A valid appointment is required.');
  }
  sendSuccess(response, { consultation: await activeConsultation(request.user, request.params.appointmentId) });
});
doctorRouter.post('/consultations/:appointmentId/:action', async (request, response) => {
  const { appointmentId, action } = request.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointmentId)
    || Object.keys(request.body ?? {}).length) throw new HttpError(400, 'A valid appointment is required.');
  if (action === 'complete') return sendSuccess(response,
    { appointment: await completeConsultation(request.user.id, appointmentId) });
  if (!['accept', 'decline'].includes(action)) throw new HttpError(400, 'Invalid care action.');
  sendSuccess(response, { appointment: await decideCare(request.user.id, appointmentId, action) });
});
doctorRouter.put('/availability/today', validateTodayAvailability, updateTodayAvailability);
doctorRouter.use(requireVerifiedDoctor);
doctorRouter.get('/patients', patients);
doctorRouter.get('/sessions', sessions);
doctorRouter.post('/prescriptions', validateCreatePrescription, createPrescription);
