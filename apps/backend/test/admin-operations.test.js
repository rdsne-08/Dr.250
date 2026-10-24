import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminOperations } from '../src/modules/admin/services/admin.service.js';
import { requireRole } from '../src/modules/auth/middleware/requireRole.js';

test('admin activity query returns only verification decisions and provider identity', async () => {
  const event = { id: 'event-1', entity_type: 'DOCTOR', status: 'VERIFIED', provider_name: 'Dr One' };
  const database = { query: async (sql, values) => {
    assert.match(sql, /VERIFICATION_STATUS_CHANGED/);
    assert.match(sql, /LIMIT 20/);
    assert.doesNotMatch(sql, /SELECT\s+\*/i);
    assert.deepEqual(values, []);
    return { rows: [event] };
  } };
  assert.deepEqual(await getAdminOperations(database), {
    activity: [event], database: 'available', authentication: 'unavailable',
  });
});

test('admin-only middleware rejects patient and doctor roles', () => {
  const guard = requireRole('ADMIN');
  for (const role of ['PATIENT', 'DOCTOR', 'LAB']) {
    let error;
    guard({ user: { role } }, {}, value => { error = value; });
    assert.equal(error.statusCode, 403);
  }
  let error;
  guard({ user: { role: 'ADMIN' } }, {}, value => { error = value; });
  assert.equal(error, undefined);
});
