import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';

export const adminRouter = Router();

adminRouter.get('/test', authenticate, requireRole('ADMIN'), (request, response) => {
  response.status(200).json({
    message: 'Admin access granted.',
    user: request.user,
  });
});
