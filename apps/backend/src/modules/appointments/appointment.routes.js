import { Router } from 'express';
import { authenticate } from '../auth/middleware/auth.js';
import { requireRole } from '../auth/middleware/requireRole.js';
import { HttpError } from '../../middleware/http-error.js';
import { sendSuccess } from '../../middleware/response.js';
import { bookAppointment, cancelAppointment, discoverDoctors, patientAppointments } from './appointment.service.js';

export const appointmentRouter = Router();
appointmentRouter.use(authenticate, requireRole('PATIENT'));

appointmentRouter.get('/doctors', async (request, response) => {
  sendSuccess(response, await discoverDoctors(request.user.id));
});

appointmentRouter.get('/', async (request, response) => {
  sendSuccess(response, { appointments: await patientAppointments(request.user.id) });
});

appointmentRouter.post('/', async (request, response) => {
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !['doctor_id', 'local_date'].includes(key))
    || typeof body.doctor_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.doctor_id)
    || (body.local_date !== undefined && (typeof body.local_date !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(body.local_date)))) {
    throw new HttpError(400, 'Choose a valid doctor and chamber date.');
  }
  const appointment = await bookAppointment(request.user.id, body.doctor_id, body.local_date);
  sendSuccess(response, { appointment }, 201);
});

appointmentRouter.post('/:appointmentId/cancel', async (request, response) => {
  const { appointmentId } = request.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointmentId)
    || Object.keys(request.body ?? {}).length) throw new HttpError(400, 'A valid appointment is required.');
  sendSuccess(response, { appointment: await cancelAppointment(request.user.id, appointmentId) });
});
