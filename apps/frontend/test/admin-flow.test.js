import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { adminService } from '../src/services/adminService.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test('approval is persisted through the API and survives a dashboard reload', async () => {
  let status = 'PENDING';
  globalThis.fetch = async (url, options) => {
    let data;
    if (options.method === 'PATCH') {
      assert.deepEqual(JSON.parse(options.body), { entity_type: 'DOCTOR', status: 'VERIFIED' });
      status = 'VERIFIED'; data = { verification: { id: 'doctor-1', verification_status: status } };
    } else if (url.endsWith('/doctors')) data = { doctors: [{ id: 'doctor-1', verification_status: status }] };
    else if (url.endsWith('/labs')) data = { laboratories: [] };
    else if (url.endsWith('/operations')) data = { activity: [], database: 'available', authentication: 'unavailable' };
    else data = { users: [] };
    return Response.json({ success: true, data });
  };
  assert.equal((await adminService.getDashboard()).doctors[0].verification_status, 'PENDING');
  assert.equal((await adminService.verify('doctor-1', 'DOCTOR', 'VERIFIED')).verification_status, 'VERIFIED');
  assert.equal((await adminService.getDashboard()).doctors[0].verification_status, 'VERIFIED');
});
test('dashboard retrieves server activity and honest health states', async () => {
  const paths = [];
  globalThis.fetch = async url => {
    const path = new URL(url).pathname;
    paths.push(path);
    const data = path.endsWith('/operations')
      ? { activity: [{ id: 'event-1', entity_type: 'DOCTOR', status: 'VERIFIED' }], database: 'available', authentication: 'unavailable' }
      : path.endsWith('/users') ? { users: [] }
        : path.endsWith('/doctors') ? { doctors: [] } : { laboratories: [] };
    return Response.json({ success: true, data });
  };
  const dashboard = await adminService.getDashboard();
  assert.ok(paths.includes('/api/admin/operations'));
  assert.equal(dashboard.activity[0].status, 'VERIFIED');
  assert.deepEqual(dashboard.health, { database: 'available', authentication: 'unavailable' });
});
test('rejected approval and list failures propagate rather than report success', async () => {
  globalThis.fetch = async () => Response.json({ message: 'Forbidden' }, { status: 403 });
  await assert.rejects(adminService.verify('doctor-1', 'DOCTOR', 'VERIFIED'), { status: 403 });
  await assert.rejects(adminService.getDashboard(), { status: 403 });
});
