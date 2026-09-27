import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import {
  health,
  history,
  summary,
  symptoms,
} from '../controllers/ai.controller.js';

export const aiRouter = Router();

aiRouter.get('/health', health);

aiRouter.use(authenticate);
aiRouter.post('/history', requireRole('PATIENT', 'DOCTOR', 'ADMIN'), history);
aiRouter.post('/summary', requireRole('DOCTOR'), summary);
aiRouter.post('/symptoms', requireRole('PATIENT', 'DOCTOR'), symptoms);
