import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/environment.js';
import { testDatabaseConnection } from './database/pool.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { adminRouter } from './modules/admin/routes/admin.routes.js';
import { authRouter } from './modules/auth/routes/auth.routes.js';
import { doctorRouter } from './modules/doctors/routes/doctor.routes.js';
import { labRouter } from './modules/labs/routes/lab.routes.js';
import { medicalRecordRouter } from './modules/medical-records/routes/medical-record.routes.js';
import { patientRouter } from './modules/patients/routes/patient.routes.js';
import { prescriptionRouter } from './modules/prescriptions/routes/prescription.routes.js';
import { reportRouter } from './modules/reports/routes/report.routes.js';
import { sessionRouter } from './modules/sessions/routes/session.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_request, response) => {
  try {
    await testDatabaseConnection();
    response.status(200).json({
      status: 'OK',
      service: 'Dr.250 backend',
      database: 'connected',
    });
  } catch {
    response.status(503).json({
      status: 'DEGRADED',
      service: 'Dr.250 backend',
      database: 'unavailable',
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/patients', patientRouter);
app.use('/api/doctors', doctorRouter);
app.use('/api/labs', labRouter);
app.use('/api/admin', adminRouter);
app.use('/api/medical-records', medicalRecordRouter);
app.use('/api/prescriptions', prescriptionRouter);
app.use('/api/reports', reportRouter);
app.use('/api/sessions', sessionRouter);

app.use(notFoundHandler);
app.use(errorHandler);
