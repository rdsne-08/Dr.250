import assert from 'node:assert/strict';
import { File } from 'node:buffer';
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

const { authService } = await import('../src/services/authService.js');
const { clearApiSession, storeApiSession } = await import('../src/services/apiClient.js');
const { doctorService } = await import('../src/services/doctorService.js');
const { labService } = await import('../src/services/labService.js');
const { patientService } = await import('../src/services/patientService.js');

afterEach(() => {
  clearApiSession();
  globalThis.fetch = originalFetch;
});

after(() => {
  delete globalThis.window;
});

test('laboratory registration sends the required database profile fields', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, body: JSON.parse(options.body) });
    const data = path === '/api/auth/register'
      ? { user: { role: 'LAB' } }
      : {
          access_token: 'lab-token',
          refresh_token: 'lab-refresh',
          expires_in: 3600,
          user: {
            user_id: 'lab-user',
            profile_id: 'lab-profile',
            email: 'lab@example.com',
            full_name: 'Lab Operator',
            role: 'LAB',
          },
          role: 'LAB',
        };
    return new Response(JSON.stringify({ success: true, data }), {
      status: path === '/api/auth/register' ? 201 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await authService.register({
    name: 'Lab Operator',
    email: 'lab@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'LAB',
    labName: 'Dhaka Diagnostics',
    licenseNumber: 'DGHS-1234',
  });

  assert.deepEqual(requests[0].body, {
    email: 'lab@example.com',
    full_name: 'Lab Operator',
    password: 'password123',
    role: 'LAB',
    lab_name: 'Dhaka Diagnostics',
    license_number: 'DGHS-1234',
  });
});

test('doctor creates an authorized laboratory request', async () => {
  storeApiSession({ accessToken: 'doctor-token', expiresIn: 3600 });
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      success: true,
      data: { report: { id: 'report-id', ...requestBody } },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };

  await doctorService.createLabRequest({
    patientId: '20000000-0000-4000-8000-000000000001',
    laboratoryId: '30000000-0000-4000-8000-000000000001',
    testName: 'Complete Blood Count',
  });

  assert.deepEqual(requestBody, {
    patient_id: '20000000-0000-4000-8000-000000000001',
    laboratory_id: '30000000-0000-4000-8000-000000000001',
    test_name: 'Complete Blood Count',
    status: 'REQUESTED',
  });
});

test('lab dashboard receives assignments and can update status and upload a report file', async () => {
  storeApiSession({ accessToken: 'lab-token', expiresIn: 3600 });
  const reportId = '40000000-0000-4000-8000-000000000001';
  const responses = {
    '/api/labs/profile': {
      laboratory: {
        id: 'lab-id',
        lab_name: 'Dhaka Diagnostics',
        email: 'lab@example.com',
        verification_status: 'VERIFIED',
      },
    },
    '/api/labs/reports': {
      reports: [{
        id: reportId,
        patient_id: 'patient-id',
        patient_name: 'Patient Example',
        requested_by_doctor_id: 'doctor-id',
        requested_by_doctor: 'Dr. Example',
        test_name: 'Complete Blood Count',
        status: 'REQUESTED',
        created_at: '2026-09-26T10:00:00.000Z',
        updated_at: '2026-09-26T10:00:00.000Z',
      }],
    },
  };

  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (options.method === 'GET') {
      return new Response(JSON.stringify({ success: true, data: responses[path] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (options.body instanceof FormData) {
      assert.equal(options.body.get('report_id'), reportId);
      assert.equal(options.body.get('status'), 'COMPLETED');
      assert.equal(options.body.get('test_name'), 'Complete Blood Count');
      assert.ok(options.body.get('file') instanceof File);
    } else {
      assert.deepEqual(JSON.parse(options.body), {
        report_id: reportId,
        status: 'PROCESSING',
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data: { report: { id: reportId } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const dashboard = await labService.getDashboard();
  assert.equal(dashboard.doctorRequests.length, 1);
  assert.equal(dashboard.tests[0].rawStatus, 'REQUESTED');

  await labService.updateReportStatus(reportId, 'PROCESSING');
  await labService.uploadReport({
    reportId,
    testType: 'Complete Blood Count',
    note: 'Values are within the reference range.',
    file: new File(['%PDF test report'], 'cbc.pdf', { type: 'application/pdf' }),
  });
});

test('patient dashboard shows the completed laboratory report', async () => {
  storeApiSession({ accessToken: 'patient-token', expiresIn: 3600 });
  const responses = {
    '/api/patients/profile': { patient: { id: 'patient-id', full_name: 'Patient Example' } },
    '/api/patients/records': { records: [] },
    '/api/patients/prescriptions': { prescriptions: [] },
    '/api/patients/reports': {
      reports: [{
        id: 'report-id',
        test_name: 'Complete Blood Count',
        lab_name: 'Dhaka Diagnostics',
        status: 'COMPLETED',
        file_url: 'http://localhost:3000/api/reports/report-id/file',
        created_at: '2026-09-26T10:00:00.000Z',
        updated_at: '2026-09-26T11:00:00.000Z',
      }],
    },
    '/api/sessions': { sessions: [] },
  };
  globalThis.fetch = async (url) => new Response(JSON.stringify({
    success: true,
    data: responses[new URL(url).pathname],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const dashboard = await patientService.getDashboard();
  const report = dashboard.timeline.find((event) => event.type === 'report');
  assert.equal(dashboard.overview.find((item) => item.id === 'reports').value, 1);
  assert.equal(report.title, 'Complete Blood Count report');
  assert.match(report.detail, /Completed by Dhaka Diagnostics/);
});
