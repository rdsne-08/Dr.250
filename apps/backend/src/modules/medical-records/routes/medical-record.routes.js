import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { addMedicalRecord, listMedicalRecords } from '../controllers/medical-record.controller.js';
import {
  validateCreateMedicalRecord,
  validateMedicalRecordPatient,
} from '../validators/medical-record.validator.js';

export const medicalRecordRouter = Router();

medicalRecordRouter.use(authenticate);
medicalRecordRouter.get(
  '/:patientId',
  requireRole('PATIENT', 'DOCTOR'),
  validateMedicalRecordPatient,
  listMedicalRecords,
);
medicalRecordRouter.post(
  '/',
  requireRole('PATIENT', 'DOCTOR'),
  validateCreateMedicalRecord,
  addMedicalRecord,
);
