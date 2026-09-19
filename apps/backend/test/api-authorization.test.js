import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { createAuthenticate } = await import('../src/modules/auth/middleware/auth.js');
const { assertPatientOwnership } = await import('../src/modules/patients/services/patient.service.js');
const { authorizePatientDataAccess } = await import(
  '../src/modules/sessions/services/access.service.js'
);

function mockRequest(authorization) {
  return {
    get(name) {
      return name.toLowerCase() === 'authorization' ? authorization : undefined;
    },
  };
}

test('authentication middleware rejects requests without a bearer token', async () => {
  const middleware = createAuthenticate({
    authClient: { auth: { getUser: async () => ({}) } },
    profileLookup: async () => null,
  });
  const request = mockRequest(undefined);
  const error = await new Promise((resolve) => middleware(request, {}, resolve));

  assert.equal(error.statusCode, 401);
  assert.equal(error.message, 'A Bearer access token is required.');
});

test('authentication middleware attaches the verified user and application profile', async () => {
  const profile = { profile_id: 'profile-1', role: 'PATIENT', email: 'patient@example.com' };
  const middleware = createAuthenticate({
    authClient: {
      auth: {
        getUser: async (token) => {
          assert.equal(token, 'valid-token');
          return { data: { user: { id: 'user-1', email: 'patient@example.com' } } };
        },
      },
    },
    profileLookup: async (userId) => {
      assert.equal(userId, 'user-1');
      return profile;
    },
  });
  const request = mockRequest('Bearer valid-token');
  const error = await new Promise((resolve) => middleware(request, {}, resolve));

  assert.equal(error, undefined);
  assert.equal(request.user.role, 'PATIENT');
  assert.deepEqual(request.user.profile, profile);
});

test('patient ownership rejects a different patient id', async () => {
  const database = {
    query: async () => ({ rows: [{ id: 'patient-owned' }] }),
  };

  await assert.rejects(
    assertPatientOwnership('user-1', 'patient-other', database),
    (error) => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED',
  );
});

test('doctor authorization accepts a verified doctor with an active access session', async () => {
  const database = {
    query: async () => ({
      rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: true }],
    }),
  };

  const actor = await authorizePatientDataAccess(
    { id: 'user-doctor', role: 'DOCTOR' },
    'patient-1',
    database,
  );

  assert.deepEqual(actor, { role: 'DOCTOR', doctorId: 'doctor-1' });
});

test('doctor authorization rejects access without an active session', async () => {
  const database = {
    query: async () => ({
      rows: [{ id: 'doctor-1', verification_status: 'VERIFIED', authorized: false }],
    }),
  };

  await assert.rejects(
    authorizePatientDataAccess(
      { id: 'user-doctor', role: 'DOCTOR' },
      'patient-1',
      database,
    ),
    (error) => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED',
  );
});
