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
    else data = { users: [] };
    return Response.json({ success: true, data });
  };
  assert.equal((await adminService.getDashboard()).doctors[0].verification_status, 'PENDING');
  assert.equal((await adminService.verify('doctor-1', 'DOCTOR', 'VERIFIED')).verification_status, 'VERIFIED');
  assert.equal((await adminService.getDashboard()).doctors[0].verification_status, 'VERIFIED');
});
test('rejected approval and list failures propagate rather than report success', async () => {
  globalThis.fetch = async () => Response.json({ message: 'Forbidden' }, { status: 403 });
  await assert.rejects(adminService.verify('doctor-1', 'DOCTOR', 'VERIFIED'), { status: 403 });
  await assert.rejects(adminService.getDashboard(), { status: 403 });
});
