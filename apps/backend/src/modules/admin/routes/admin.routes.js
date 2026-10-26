import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { HttpError } from '../../../middleware/http-error.js';
import { sendSuccess } from '../../../middleware/response.js';
import { listDoctorApplications, verifyEntity } from '../services/admin.service.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('ADMIN'));

adminRouter.get('/doctors', async (_request, response) => {
  sendSuccess(response, { doctors: await listDoctorApplications() });
});

adminRouter.patch('/doctors/:doctorId/verification', async (request, response) => {
  const { doctorId } = request.params;
  const { status } = request.body ?? {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(doctorId)) {
    throw new HttpError(400, 'A valid doctor ID is required.');
  }
  const doctor = await verifyEntity({ id: doctorId, entityType: 'DOCTOR', status,
    adminUserId: request.user.id });
  sendSuccess(response, { doctor });
});
