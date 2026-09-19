import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { createReport, listReports } from '../controllers/report.controller.js';
import { validateCreateReport, validateReportPatient } from '../validators/report.validator.js';

export const reportRouter = Router();

reportRouter.use(authenticate);
reportRouter.get(
  '/:patientId',
  requireRole('PATIENT', 'DOCTOR', 'LAB', 'ADMIN'),
  validateReportPatient,
  listReports,
);
reportRouter.post('/', requireRole('DOCTOR', 'LAB'), validateCreateReport, createReport);
