import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { createSession, listSessions, revokeSession, verifiedDoctors } from '../controllers/session.controller.js';
import { validateCreateSession, validateSessionId } from '../validators/session.validator.js';

export const sessionRouter = Router();

sessionRouter.use(authenticate);
sessionRouter.get('/', requireRole('PATIENT', 'DOCTOR'), listSessions);
sessionRouter.post('/', requireRole('PATIENT'), validateCreateSession, createSession);
sessionRouter.patch('/:sessionId/revoke', requireRole('PATIENT'), validateSessionId, revokeSession);

sessionRouter.get('/doctors', requireRole('PATIENT'), verifiedDoctors);
