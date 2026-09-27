import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { createReport, downloadReport, listReports } from '../controllers/report.controller.js';
import {
  validateCreateReport,
  validateReportId,
  validateReportPatient,
} from '../validators/report.validator.js';

export const reportRouter = Router();

reportRouter.use(authenticate);
reportRouter.get(
  '/:reportId/file',
  requireRole('PATIENT', 'DOCTOR', 'LAB', 'ADMIN'),
  validateReportId,
  downloadReport,
);
reportRouter.get(
  '/:patientId',
  requireRole('PATIENT', 'DOCTOR', 'LAB', 'ADMIN'),
  validateReportPatient,
  listReports,
);
reportRouter.post('/', requireRole('DOCTOR', 'LAB'), validateCreateReport, createReport);
