import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/environment.js';
import { testDatabaseConnection } from './database/pool.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { adminRouter } from './modules/admin/routes/admin.routes.js';
import { authRouter } from './modules/auth/routes/auth.routes.js';
import { doctorRouter } from './modules/doctors/routes/doctor.routes.js';
import { medicalRecordRouter } from './modules/medical-records/routes/medical-record.routes.js';
import { patientRouter } from './modules/patients/routes/patient.routes.js';
import { prescriptionRouter } from './modules/prescriptions/routes/prescription.routes.js';
import { sessionRouter } from './modules/sessions/routes/session.routes.js';

export function createApp({ databaseCheck = testDatabaseConnection } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        service: 'Dr.250 backend',
        status: 'ok',
      },
    });
  });

  app.get('/api/health/database', async (_request, response) => {
    try {
      const connected = await databaseCheck();
      if (!connected) throw new Error('Database connection check returned false.');

      response.status(200).json({
        success: true,
        database: 'connected',
      });
    } catch {
      response.status(503).json({
        success: false,
        message: 'The database connection is unavailable.',
        error: 'DATABASE_UNAVAILABLE',
      });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/patients', patientRouter);
  app.use('/api/doctors', doctorRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/medical-records', medicalRecordRouter);
  app.use('/api/prescriptions', prescriptionRouter);
  app.use('/api/sessions', sessionRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
