import { randomUUID } from 'node:crypto';

const urlText = process.env.DR250_DISPOSABLE_URL;
const email = process.argv[2]?.trim().toLowerCase();
const fullName = process.argv[3]?.trim();
const password = process.env.DR250_DEMO_ADMIN_PASSWORD;

if (!urlText || process.env.DATABASE_URL !== urlText || process.env.NODE_ENV === 'production') {
  throw new Error('Use a disposable database URL in DATABASE_URL and DR250_DISPOSABLE_URL outside production.');
}
const url = new URL(urlText);
if (!['localhost', '127.0.0.1'].includes(url.hostname)
  || !/^\/dr250_release_[a-z_]+$/.test(url.pathname)) {
  throw new Error('Demo Admin provisioning requires a loopback dr250_release_* database.');
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName
  || !password || password.length < 12) {
  throw new Error('Provide an email and name as arguments and a 12+ character DR250_DEMO_ADMIN_PASSWORD.');
}

const [{ createProfile }, { hashPassword }, { closeDatabase }] = await Promise.all([
  import('../src/modules/auth/services/profile.service.js'),
  import('../src/modules/auth/services/local-auth.service.js'),
  import('../src/database/pool.js'),
]);
try {
  const profile = await createProfile({ userId: randomUUID(), email, fullName,
    role: 'ADMIN', passwordHash: await hashPassword(password) });
  console.log(`Created disposable Admin ${profile.email}.`);
} finally {
  await closeDatabase();
}
