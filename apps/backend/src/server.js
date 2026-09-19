import { app } from './app.js';
import { env } from './config/environment.js';
import { closeDatabase } from './database/pool.js';

const server = app.listen(env.port, () => {
  console.log(`Dr.250 backend listening on port ${env.port}`);
});

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully.`);

  server.close(async (serverError) => {
    try {
      await closeDatabase();
    } catch (databaseError) {
      console.error('Failed to close the PostgreSQL pool.', databaseError);
      process.exitCode = 1;
    }

    if (serverError) {
      console.error('Failed to close the HTTP server.', serverError);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, server };
