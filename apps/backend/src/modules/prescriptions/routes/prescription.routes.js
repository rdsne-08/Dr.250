import { Router } from 'express';

import { authenticate } from '../../auth/middleware/auth.js';
import { requireRole } from '../../auth/middleware/requireRole.js';
import { requireVerifiedDoctor } from '../../doctors/middleware/verified-doctor.js';
import { createPrescription, listPrescriptions } from '../controllers/prescription.controller.js';
import {
  validateCreatePrescription,
  validatePrescriptionPatient,
} from '../validators/prescription.validator.js';

export const prescriptionRouter = Router();

prescriptionRouter.use(authenticate);
prescriptionRouter.get(
  '/:patientId',
  requireRole('PATIENT', 'DOCTOR', 'ADMIN'),
  validatePrescriptionPatient,
  listPrescriptions,
);
prescriptionRouter.post(
  '/',
  requireRole('DOCTOR'),
  requireVerifiedDoctor,
  validateCreatePrescription,
  createPrescription,
);
