import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { createAuthenticate } = await import('../src/modules/auth/middleware/auth.js');
const { uploadAssignedReport } = await import('../src/modules/labs/services/lab.service.js');
const { assertPatientOwnership } = await import('../src/modules/patients/services/patient.service.js');
const {
  getAuthorizedReportFile,
  getPatientReports,
} = await import('../src/modules/reports/services/report.service.js');
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

test('authentication middleware rejects an invalid token', async () => {
  const middleware = createAuthenticate({
    authClient: {
      auth: {
        getUser: async () => ({ data: { user: null }, error: { status: 401 } }),
      },
    },
    profileLookup: async () => {
      throw new Error('Profile lookup must not run for an invalid token.');
    },
  });
  const request = mockRequest('Bearer invalid-token');
  const error = await new Promise((resolve) => middleware(request, {}, resolve));

  assert.equal(error.statusCode, 401);
  assert.equal(error.message, 'The authentication token is invalid or expired.');
});

test('authentication middleware reports an upstream authentication outage', async () => {
  const middleware = createAuthenticate({
    authClient: {
      auth: {
        getUser: async () => ({ data: null, error: { status: 503 } }),
      },
    },
  });
  const request = mockRequest('Bearer unavailable-token');
  const error = await new Promise((resolve) => middleware(request, {}, resolve));

  assert.equal(error.statusCode, 503);
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

test('patient ownership accepts the authenticated patient id', async () => {
  const patient = { id: 'patient-owned' };
  const database = {
    query: async () => ({ rows: [patient] }),
  };

  assert.equal(await assertPatientOwnership('user-1', patient.id, database), patient);
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

test('laboratory report reads are constrained to the authenticated laboratory', async () => {
  const calls = [];
  const database = {
    async query(text, values) {
      calls.push({ text, values });
      if (calls.length === 1) {
        return {
          rows: [{ id: 'lab-1', verification_status: 'VERIFIED' }],
        };
      }
      return { rows: [] };
    },
  };

  await getPatientReports({ id: 'lab-user', role: 'LAB' }, 'patient-1', database);

  assert.equal(calls.length, 2);
  assert.match(calls[1].text, /report\.laboratory_id = \$2/);
  assert.deepEqual(calls[1].values, ['patient-1', 'lab-1']);
});

test('laboratory cannot update a report assigned to another laboratory', async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(text, values = []) {
      calls.push({ text, values });
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };
  const database = { connect: async () => client };

  await assert.rejects(
    uploadAssignedReport(
      { id: 'lab-1' },
      { reportId: 'report-for-lab-2', status: 'PROCESSING' },
      database,
    ),
    (error) => error.statusCode === 404 && error.code === 'REPORT_NOT_FOUND',
  );

  const ownershipQuery = calls.find((call) => call.text.includes('FROM public.lab_reports'));
  assert.deepEqual(ownershipQuery.values, ['report-for-lab-2', 'lab-1', null]);
  assert.ok(calls.some((call) => call.text === 'ROLLBACK'));
  assert.equal(released, true);
});

test('patient cannot download a completed report owned by another patient', async () => {
  const database = {
    async query(text) {
      if (text.includes('FROM public.lab_reports')) {
        return {
          rows: [{
            id: 'report-1',
            patient_id: 'patient-other',
            laboratory_id: 'lab-1',
            test_name: 'CBC',
            file_url: 'http://localhost/api/reports/report-1/file',
            status: 'COMPLETED',
          }],
        };
      }
      return { rows: [] };
    },
  };

  await assert.rejects(
    getAuthorizedReportFile(
      { id: 'patient-user', role: 'PATIENT' },
      'report-1',
      database,
    ),
    (error) => error.statusCode === 403 && error.code === 'PATIENT_ACCESS_DENIED',
  );
});
