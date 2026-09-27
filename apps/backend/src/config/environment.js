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

function parsePositiveInteger(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
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
  supabaseUrl: requireEnvironmentVariable('SUPABASE_URL'),
  supabaseAnonKey: requireEnvironmentVariable('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY'),
  aiServiceUrl: process.env.AI_SERVICE_URL?.trim() || 'http://ai-service:8000',
  aiRequestTimeoutMs: parsePositiveInteger(
    process.env.AI_REQUEST_TIMEOUT_MS ?? '30000',
    'AI_REQUEST_TIMEOUT_MS',
  ),
});
