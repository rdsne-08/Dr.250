import assert from 'node:assert/strict';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../../../');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const [{ createApp }, { closeDatabase, query }, { supabaseAdmin }] = await Promise.all([
  import('../src/app.js'),
  import('../src/database/pool.js'),
  import('../src/config/supabase.js'),
]);

const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const nativeFetch = globalThis.fetch;
const email = `dr250.patient.e2e.${Date.now()}@example.com`;
const password = `Dr250-E2E-${Date.now()}!`;
let userId;

globalThis.window = {
  dispatchEvent() {},
  localStorage: createStorage(),
  sessionStorage: createStorage(),
};
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === 'localhost' && url.port === '3000') {
    return nativeFetch(`${baseUrl}${url.pathname}${url.search}`, init);
  }
  return nativeFetch(input, init);
};

const [{ authService }, { readApiSession, clearApiSession }, { patientService }] = await Promise.all([
  import('../../frontend/src/services/authService.js'),
  import('../../frontend/src/services/apiClient.js'),
  import('../../frontend/src/services/patientService.js'),
]);

try {
  const registration = await authService.register({
    name: 'Dr.250 E2E Patient',
    email,
    password,
    confirmPassword: password,
    role: 'PATIENT',
    remember: true,
  });
  assert.equal(registration.user.role, 'PATIENT');

  const databaseResult = await query(
    `
      SELECT app_user.id AS user_id, profile.id AS profile_id, patient.id AS patient_id,
             profile.role, profile.full_name
      FROM public.users AS app_user
      INNER JOIN public.profiles AS profile ON profile.user_id = app_user.id
      INNER JOIN public.patients AS patient ON patient.profile_id = profile.id
      WHERE lower(app_user.email) = lower($1)
    `,
    [email],
  );
  assert.equal(databaseResult.rowCount, 1);
  assert.equal(databaseResult.rows[0].role, 'PATIENT');
  userId = databaseResult.rows[0].user_id;

  const storedSession = readApiSession();
  assert.ok(storedSession?.accessToken);
  assert.ok(storedSession?.refreshToken);

  const restored = await authService.getSession();
  assert.equal(restored.user.id, userId);
  assert.equal(restored.user.role, 'PATIENT');

  const dashboard = await patientService.getDashboard();
  assert.equal(dashboard.patient.id, databaseResult.rows[0].patient_id);
  assert.equal(dashboard.patient.name.en, 'Dr.250 E2E Patient');
  assert.equal(dashboard.patient.activeMedicines, 0);
  assert.equal(dashboard.doctorAccess.activeSessions, 0);

  console.log(JSON.stringify({
    status: 'passed',
    signup: true,
    databaseRows: ['users', 'profiles', 'patients'],
    login: true,
    jwtStored: true,
    sessionRestored: true,
    authMe: true,
    dashboardLoaded: true,
  }));
} finally {
  clearApiSession();
  globalThis.fetch = nativeFetch;
  delete globalThis.window;

  if (!userId) {
    const lookup = await query(`SELECT id FROM public.users WHERE lower(email) = lower($1)`, [email]);
    userId = lookup.rows[0]?.id;
  }
  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) console.error(`Supabase cleanup failed: ${error.message}`);
    await query(`DELETE FROM public.users WHERE id = $1`, [userId]);
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeDatabase();
}
