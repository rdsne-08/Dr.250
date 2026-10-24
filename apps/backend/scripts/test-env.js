import dotenv from 'dotenv';
// Tests must never read the workspace .env or inherit production credentials.
dotenv.config = () => ({ parsed: {} });
const disposable = process.env.DR250_DISPOSABLE_URL;
if (disposable) {
  const url = new URL(disposable);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !/^\/dr250_release_[a-z_]+$/.test(url.pathname)) {
    throw new Error('Disposable test database must be loopback and named dr250_release_*');
  }
}
Object.assign(process.env, {
  DATABASE_URL: disposable || 'postgresql://audit:audit@127.0.0.1:1/dr250_release_disabled',
  DATABASE_INTEGRATION_URL: '', DATABASE_SSL: 'false', NODE_ENV: 'test',
  SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'test-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service',
});
