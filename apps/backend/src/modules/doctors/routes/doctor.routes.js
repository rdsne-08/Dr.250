import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';

export const doctorRouter = Router();

doctorRouter.get('/test', authenticate, requireRole('DOCTOR'), (request, response) => {
  response.status(200).json({
    message: 'Doctor access granted.',
    user: request.user,
  });
});
