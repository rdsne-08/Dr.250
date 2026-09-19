import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { app } from './app.js';
import { env } from './config/environment.js';
import { closeDatabase } from './database/pool.js';

let server;
let isShuttingDown = false;
let signalHandlersRegistered = false;

function isMainModule() {
  return Boolean(
    process.argv[1]
      && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url,
  );
}

export function startServer({ host, port = env.port } = {}) {
  if (server?.listening) return server;

  server = app.listen(port, host, () => {
    const address = server.address();
    const listeningPort = typeof address === 'object' && address ? address.port : port;
    console.log(`Dr.250 backend listening on port ${listeningPort}`);
  });

  server.on('error', (error) => {
    console.error('The HTTP server failed.', error);
    process.exitCode = 1;
  });

  if (!signalHandlersRegistered) {
    signalHandlersRegistered = true;
    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  }

  return server;
}

function closeHttpServer(httpServer) {
  return new Promise((resolve, reject) => {
    if (!httpServer?.listening) {
      resolve();
      return;
    }

    httpServer.close((error) => (error ? reject(error) : resolve()));
    httpServer.closeIdleConnections?.();
  });
}

export async function shutdown(signal = 'manual', options = {}) {
  const { closeDatabasePool = true, exitProcess = isMainModule() } = options;

  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully.`);

  const forceExitTimer = exitProcess
    ? setTimeout(() => {
        console.error('Graceful shutdown timed out.');
        process.exit(1);
      }, 10_000).unref()
    : null;

  try {
    await closeHttpServer(server);
    if (closeDatabasePool) await closeDatabase();
  } catch (error) {
    console.error('Graceful shutdown failed.', error);
    process.exitCode = 1;
  } finally {
    if (forceExitTimer) clearTimeout(forceExitTimer);
    server = undefined;
    isShuttingDown = false;
  }

  if (exitProcess) process.exit(process.exitCode ?? 0);
}

if (isMainModule()) startServer();

export { app };
