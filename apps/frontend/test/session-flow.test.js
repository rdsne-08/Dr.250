import assert from 'node:assert/strict';
import test, { after, afterEach } from 'node:test';

const entries = new Map();
const storage = { getItem: key => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, String(value)),
  removeItem: key => entries.delete(key) };
const originalFetch = globalThis.fetch;
globalThis.window = { dispatchEvent() {}, localStorage: storage, sessionStorage: storage };
const { clearApiSession, storeApiSession } = await import('../src/services/apiClient.js');
const { patientService } = await import('../src/services/patientService.js');

afterEach(() => { clearApiSession(); globalThis.fetch = originalFetch; });
after(() => { delete globalThis.window; });

test('patient selects a verified doctor, grants direct access, then revokes it', async () => {
  storeApiSession({ accessToken: 'patient-jwt' });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, options });
    assert.equal(options.headers.get('Authorization'), 'Bearer patient-jwt');
    const data = path === '/api/sessions/doctors' ? { doctors: [{ id: 'doctor-1', full_name: 'Dr One' }] }
      : path.endsWith('/revoke') ? { session: { id: 'connection-1', revoked_at: new Date().toISOString() } }
        : { session: { id: 'connection-1', status: 'ACTIVE' } };
    return Response.json({ success: true, data });
  };
  assert.equal((await patientService.getVerifiedDoctors())[0].id, 'doctor-1');
  const connection = await patientService.createDoctorAccess('doctor-1');
  assert.equal(connection.status, 'ACTIVE');
  assert.equal(requests[1].path, '/api/sessions');
  const body = JSON.parse(requests[1].options.body);
  assert.equal(body.doctor_id, 'doctor-1');
  assert.ok(Date.parse(body.expires_at) > Date.now() + 29 * 24 * 60 * 60_000);
  assert.equal(await patientService.revokeDoctorAccess(connection.id).then(value => value.id), connection.id);
  assert.equal(requests[2].path, '/api/sessions/connection-1/revoke');
});

test('patient access history uses the authenticated endpoint', async () => {
  storeApiSession({ accessToken: 'patient-jwt' });
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/patients/access-logs');
    assert.equal(options.headers.get('Authorization'), 'Bearer patient-jwt');
    return Response.json({ success: true, data: { logs: [{ id: 'event-1' }] } });
  };
  assert.deepEqual(await patientService.getAccessLogs(), [{ id: 'event-1' }]);
});
