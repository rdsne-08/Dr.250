import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { profile, reports, uploadReport } from '../controllers/lab.controller.js';
import { requireVerifiedLab } from '../middleware/verified-lab.js';
import { validateLabReport } from '../validators/lab.validator.js';

export const labRouter = Router();

labRouter.use(authenticate, requireRole('LAB'), requireVerifiedLab);
labRouter.get('/profile', profile);
labRouter.get('/reports', reports);
labRouter.post('/reports', validateLabReport, uploadReport);
