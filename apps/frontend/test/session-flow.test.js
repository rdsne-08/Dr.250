import assert from 'node:assert/strict';
import test, { after, afterEach } from 'node:test';

const entries = new Map();
const storage = {
  getItem: key => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, String(value)),
  removeItem: key => entries.delete(key),
};
const originalFetch = globalThis.fetch;
globalThis.window = { dispatchEvent() {}, localStorage: storage, sessionStorage: storage };

const { clearApiSession, storeApiSession } = await import('../src/services/apiClient.js');
const { patientService } = await import('../src/services/patientService.js');
const { doctorService } = await import('../src/services/doctorService.js');

afterEach(() => { clearApiSession(); globalThis.fetch = originalFetch; });
after(() => { delete globalThis.window; });

test('patient selects a verified doctor and issues a short-lived credential request', async () => {
  storeApiSession({ accessToken: 'patient-jwt' });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, options });
    const data = path.endsWith('/doctors')
      ? { doctors: [{ id: 'doctor-1', full_name: 'Dr One' }] }
      : { session: { id: 'session-1', status: 'PENDING', access_token: 'opaque-credential' } };
    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  };
  assert.equal((await patientService.getVerifiedDoctors())[0].id, 'doctor-1');
  const before = Date.now();
  const session = await patientService.createDoctorAccess('doctor-1');
  const body = JSON.parse(requests[1].options.body);
  assert.equal(requests[1].path, '/api/sessions');
  assert.equal(requests[1].options.headers.get('Authorization'), 'Bearer patient-jwt');
  assert.equal(body.doctor_id, 'doctor-1');
  assert.ok(new Date(body.expires_at).getTime() >= before + 4 * 60_000);
  assert.equal(session.status, 'PENDING');
});

test('doctor redemption submits only the opaque credential under authentication', async () => {
  storeApiSession({ accessToken: 'doctor-jwt' });
  let request;
  globalThis.fetch = async (url, options) => {
    request = { path: new URL(url).pathname, options };
    return new Response(JSON.stringify({ success: true, data: {
      session: { status: 'ACTIVE', patient_id: 'patient-1' },
    } }), { status: 200 });
  };
  const session = await doctorService.redeemAccess('opaque-credential');
  assert.equal(request.path, '/api/sessions/redeem');
  assert.deepEqual(JSON.parse(request.options.body), { credential: 'opaque-credential' });
  assert.equal(request.options.headers.get('Authorization'), 'Bearer doctor-jwt');
  assert.equal(session.status, 'ACTIVE');
});

test('pending sessions are excluded from patient active-access count', async () => {
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    const data = {
      '/api/patients/profile': { patient: { id: 'patient-1', full_name: 'Patient One' } },
      '/api/patients/records': { records: [] },
      '/api/patients/prescriptions': { prescriptions: [] },
      '/api/patients/reports': { reports: [] },
      '/api/sessions': { sessions: [{ id: 'session-1', status: 'PENDING',
        expires_at: new Date(Date.now() + 60_000).toISOString() }] },
    }[path];
    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  };
  assert.equal((await patientService.getDashboard()).doctorAccess.activeSessions, 0);
});
test('patient access history uses the authenticated endpoint and returns audit fields', async () => {
  storeApiSession({ accessToken: 'patient-jwt' });
  const event = { id: 'event-1', provider_name: 'Dr One', action: 'RECORDS_READ',
    resource_type: 'MEDICAL_RECORD', resource_id: 'record-1', created_at: '2026-10-24T08:00:00Z' };
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/patients/access-logs');
    assert.equal(options.headers.get('Authorization'), 'Bearer patient-jwt');
    return new Response(JSON.stringify({ success: true, data: { logs: [event] } }), { status: 200 });
  };
  assert.deepEqual(await patientService.getAccessLogs(), [event]);
});
