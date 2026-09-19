import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { doctors, laboratories, users, verify } from '../controllers/admin.controller.js';
import { validateVerification } from '../validators/admin.validator.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('ADMIN'));
adminRouter.get('/users', users);
adminRouter.get('/doctors', doctors);
adminRouter.get('/labs', laboratories);
adminRouter.patch('/verify/:id', validateVerification, verify);
