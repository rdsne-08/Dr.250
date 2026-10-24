import assert from 'node:assert/strict';
import test, { after, afterEach } from 'node:test';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const originalFetch = globalThis.fetch;
globalThis.window = {
  dispatchEvent() {},
  localStorage: createStorage(),
  sessionStorage: createStorage(),
};

const {
  ApiError,
  apiRequest,
  clearApiSession,
  readApiSession,
  storeApiSession,
  unwrapApiPayload,
} = await import('../src/services/apiClient.js');
const { authService } = await import('../src/services/authService.js');
const { doctorService } = await import('../src/services/doctorService.js');
const { patientService } = await import('../src/services/patientService.js');

afterEach(() => {
  clearApiSession();
  globalThis.fetch = originalFetch;
});

after(() => {
  delete globalThis.window;
});

test('API success envelopes are unwrapped and backend errors keep message and code', async () => {
  assert.deepEqual(
    unwrapApiPayload({ success: true, data: { patient: { id: 'patient-id' } } }),
    { patient: { id: 'patient-id' } },
  );

  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    message: 'Patient profile not found.',
    error: 'PATIENT_NOT_FOUND',
  }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  await assert.rejects(
    apiRequest('/api/patients/profile', { auth: false }),
    (error) => error instanceof ApiError
      && error.message === 'Patient profile not found.'
      && error.code === 'PATIENT_NOT_FOUND',
  );
});

test('patient registration logs in and stores the returned Supabase session', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    const isRegistration = url.endsWith('/api/auth/register');
    const data = isRegistration
      ? {
          user: {
            user_id: 'user-id',
            profile_id: 'profile-id',
            patient_id: 'patient-id',
            full_name: 'Patient Example',
            role: 'PATIENT',
          },
        }
      : {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            user_id: 'user-id',
            profile_id: 'profile-id',
            email: 'patient@example.com',
            full_name: 'Patient Example',
            role: 'PATIENT',
          },
          role: 'PATIENT',
        };

    return new Response(JSON.stringify({ success: true, data }), {
      status: isRegistration ? 201 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const session = await authService.register({
    name: 'Patient Example',
    email: 'patient@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'PATIENT',
    remember: true,
  });

  assert.equal(session.user.role, 'PATIENT');
  assert.equal(session.user.profileId, 'profile-id');
  assert.equal(readApiSession().accessToken, 'access-token');
  assert.deepEqual(
    requests.map(({ url }) => new URL(url).pathname),
    ['/api/auth/register', '/api/auth/login'],
  );
});

test('doctor registration sends specialization and BMDC license fields', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, body: JSON.parse(options.body) });
    const data = path === '/api/auth/register'
      ? { user: { role: 'DOCTOR' } }
      : {
          access_token: 'doctor-access-token',
          refresh_token: 'doctor-refresh-token',
          expires_in: 3600,
          user: {
            user_id: 'doctor-user-id',
            profile_id: 'doctor-profile-id',
            email: 'doctor@example.com',
            full_name: 'Dr. Example',
            role: 'DOCTOR',
          },
          role: 'DOCTOR',
        };

    return new Response(JSON.stringify({ success: true, data }), {
      status: path === '/api/auth/register' ? 201 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const session = await authService.register({
    name: 'Dr. Example',
    email: 'doctor@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'DOCTOR',
    specialization: 'Internal Medicine',
    licenseNumber: 'BMDC-12345',
    remember: true,
  });

  assert.equal(session.user.role, 'DOCTOR');
  assert.deepEqual(requests[0], {
    path: '/api/auth/register',
    body: {
      email: 'doctor@example.com',
      full_name: 'Dr. Example',
      password: 'password123',
      role: 'DOCTOR',
      specialization: 'Internal Medicine',
      license_number: 'BMDC-12345',
    },
  });
});

test('doctor login accepts a matching doctor account and stores its session', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/auth/login');
    assert.deepEqual(JSON.parse(options.body), {
      email: 'doctor@example.com',
      password: 'password123',
    });
    return new Response(JSON.stringify({
      success: true,
      data: {
        access_token: 'doctor-token',
        refresh_token: 'doctor-refresh',
        expires_in: 3600,
        user: {
          user_id: 'doctor-user-id',
          profile_id: 'doctor-profile-id',
          email: 'doctor@example.com',
          full_name: 'Dr. Example',
          role: 'DOCTOR',
        },
        role: 'DOCTOR',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const session = await authService.login({
    email: 'doctor@example.com',
    password: 'password123',
    role: 'DOCTOR',
    remember: true,
  });

  assert.equal(session.user.role, 'DOCTOR');
  assert.equal(readApiSession().accessToken, 'doctor-token');
});

test('login rejects the wrong role without storing a token', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: {
    access_token: 'wrong-role-token', expires_in: 3600,
    user: { user_id: 'patient-id', role: 'PATIENT' }, role: 'PATIENT',
  } }), { status: 200 });
  await assert.rejects(authService.login({ email: 'patient@example.com', password: 'password123', role: 'DOCTOR' }),
    error => error.code === 'INVALID_CREDENTIALS');
  assert.equal(readApiSession(), null);
});

test('incorrect password, duplicate email, unavailable API and network errors stay distinct', async () => {
  const credentials = { email: 'patient@example.com', password: 'password123', role: 'PATIENT' };
  const registration = { ...credentials, name: 'Patient', confirmPassword: credentials.password };
  for (const [status, code, action] of [
    [401, 'INVALID_CREDENTIALS', () => authService.login(credentials)],
    [409, 'ACCOUNT_EXISTS', () => authService.register(registration)],
    [503, 'AUTH_UNAVAILABLE', () => authService.register(registration)],
  ]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Safe account error.' }), { status });
    await assert.rejects(action(), error => error.code === code);
  }
  globalThis.fetch = async () => { throw new Error('Connection refused'); };
  await assert.rejects(authService.register(registration), error => error.code === 'NETWORK_ERROR');
});

test('stored JWT restores the authenticated patient through /api/auth/me', async () => {
  storeApiSession({ accessToken: 'stored-token', refreshToken: 'refresh-token', expiresIn: 3600 });

  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/auth/me');
    assert.equal(options.headers.get('Authorization'), 'Bearer stored-token');
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: { id: 'user-id', email: 'patient@example.com' },
        profile: {
          profile_id: 'profile-id',
          user_id: 'user-id',
          full_name: 'Patient Example',
          role: 'PATIENT',
        },
        role: 'PATIENT',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const session = await authService.getSession();
  assert.deepEqual(session, {
    provider: 'supabase',
    user: {
      id: 'user-id',
      profileId: 'profile-id',
      name: 'Patient Example',
      email: 'patient@example.com',
      role: 'PATIENT',
    },
  });
});

test('patient dashboard loads real data from authenticated backend endpoints', async () => {
  storeApiSession({ accessToken: 'patient-token', expiresIn: 3600 });
  const requestedPaths = [];
  const responses = {
    '/api/patients/profile': {
      patient: { id: 'patient-id', full_name: 'Patient Example', blood_group: 'O+' },
    },
    '/api/patients/records': {
      records: [{ id: 'record-id', created_at: '2026-09-20T10:00:00.000Z' }],
    },
    '/api/patients/prescriptions': {
      prescriptions: [{ id: 'prescription-id', created_at: '2026-09-21T10:00:00.000Z' }],
    },
    '/api/patients/reports': {
      reports: [{ id: 'report-id', created_at: '2026-09-22T10:00:00.000Z' }],
    },
    '/api/sessions': {
      sessions: [{
        id: 'session-id',
        doctor_name: 'Dr. Example',
        status: 'ACTIVE',
        expires_at: '2099-01-01T00:00:00.000Z',
        revoked_at: null,
      }],
    },
  };

  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requestedPaths.push(path);
    assert.equal(options.headers.get('Authorization'), 'Bearer patient-token');
    return new Response(JSON.stringify({ success: true, data: responses[path] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const dashboard = await patientService.getDashboard();

  assert.equal(dashboard.patient.id, 'patient-id');
  assert.equal(dashboard.patient.name.en, 'Patient Example');
  assert.equal(dashboard.patient.activeMedicines, 1);
  assert.equal(dashboard.doctorAccess.activeSessions, 1);
  assert.deepEqual(requestedPaths.sort(), Object.keys(responses).sort());
});

test('doctor dashboard loads only authorized patients and their clinical history', async () => {
  storeApiSession({ accessToken: 'doctor-token', expiresIn: 3600 });
  const requestedPaths = [];
  const patientId = '20000000-0000-4000-8000-000000000001';
  const responses = {
    '/api/doctors/profile': {
      doctor: {
        id: 'doctor-id',
        full_name: 'Dr. Example',
        email: 'doctor@example.com',
        specialization: 'Internal Medicine',
        license_number: 'BMDC-12345',
        verification_status: 'VERIFIED',
      },
    },
    '/api/doctors/patients': {
      patients: [{
        id: patientId,
        full_name: 'Authorized Patient',
        date_of_birth: '1990-01-01',
        gender: 'FEMALE',
        blood_group: 'A+',
        last_accessed_at: '2026-09-20T10:00:00.000Z',
      }],
    },
    '/api/doctors/sessions': {
      sessions: [{ expires_at: '2099-01-01T00:00:00.000Z', revoked_at: null }],
    },
    '/api/doctors/laboratories': { laboratories: [] },
    [`/api/medical-records/${patientId}`]: {
      records: [{ diagnosis: 'Hypertension', notes: 'Blood pressure improving.', date: '2026-09-20' }],
    },
    [`/api/prescriptions/${patientId}`]: {
      prescriptions: [{
        medicine: 'Amlodipine 5 mg',
        dosage: 'Once daily',
        duration: '30 days',
        instructions: 'After breakfast',
        created_at: '2026-09-21T10:00:00.000Z',
      }],
    },
    [`/api/reports/${patientId}`]: {
      reports: [{ test_name: 'Lipid profile', status: 'COMPLETED', created_at: '2026-09-22T10:00:00.000Z' }],
    },
  };

  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requestedPaths.push(path);
    assert.equal(options.headers.get('Authorization'), 'Bearer doctor-token');
    return new Response(JSON.stringify({ success: true, data: responses[path] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const dashboard = await doctorService.getDashboard();

  assert.equal(dashboard.doctor.name.en, 'Dr. Example');
  assert.equal(dashboard.patients.length, 1);
  assert.equal(dashboard.patients[0].name.en, 'Authorized Patient');
  assert.equal(dashboard.patients[0].history.length, 3);
  assert.deepEqual(requestedPaths.sort(), Object.keys(responses).sort());
});

test('prescription creation submits all fields and appears in the patient dashboard data', async () => {
  storeApiSession({ accessToken: 'doctor-token', expiresIn: 3600 });
  const patientId = '20000000-0000-4000-8000-000000000001';
  let savedPrescription;

  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    assert.equal(path, '/api/doctors/prescriptions');
    savedPrescription = JSON.parse(options.body);
    return new Response(JSON.stringify({
      success: true,
      data: {
        prescription: {
          id: 'prescription-id',
          ...savedPrescription,
          created_at: '2026-09-26T10:00:00.000Z',
        },
      },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };

  await doctorService.createPrescription({
    patientId,
    medicine: 'Amlodipine 5 mg',
    dosage: 'Once daily',
    duration: '30 days',
    instructions: 'Take after breakfast.',
  });

  assert.deepEqual(savedPrescription, {
    patient_id: patientId,
    medicine: 'Amlodipine 5 mg',
    dosage: 'Once daily',
    duration: '30 days',
    instructions: 'Take after breakfast.',
  });

  storeApiSession({ accessToken: 'patient-token', expiresIn: 3600 });
  const patientResponses = {
    '/api/patients/profile': { patient: { id: patientId, full_name: 'Patient Example' } },
    '/api/patients/records': { records: [] },
    '/api/patients/prescriptions': {
      prescriptions: [{
        id: 'prescription-id',
        ...savedPrescription,
        created_at: '2026-09-26T10:00:00.000Z',
      }],
    },
    '/api/patients/reports': { reports: [] },
    '/api/sessions': { sessions: [] },
  };
  globalThis.fetch = async (url) => new Response(JSON.stringify({
    success: true,
    data: patientResponses[new URL(url).pathname],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const patientDashboard = await patientService.getDashboard();
  const prescriptionEvent = patientDashboard.timeline.find((event) => event.type === 'prescription');
  assert.equal(patientDashboard.patient.activeMedicines, 1);
  assert.equal(prescriptionEvent.title, 'Prescription: Amlodipine 5 mg');
  assert.match(prescriptionEvent.detail, /Once daily · 30 days · Take after breakfast\./);
});
