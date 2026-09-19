import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDirectory, '../../../..');

dotenv.config({
  path: path.join(projectRoot, '.env'),
  quiet: true,
});

function parsePort(value) {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535. Received: ${value}`);
  }

  return port;
}

function requireEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT ?? '3000'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: requireEnvironmentVariable('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
});
