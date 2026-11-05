import assert from 'node:assert/strict';
import test from 'node:test';

const disposable = process.env.AUTH_INTEGRATION_URL;
if (disposable) process.env.DATABASE_URL = disposable;

test('patient grant allows history reads, while prescribing requires a consultation and revocation closes access', {
  skip: !disposable && 'Set AUTH_INTEGRATION_URL to a migrated disposable loopback dr250_release_* database.',
}, async () => {
  const url = new URL(disposable);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const [{ createApp }, { query, closeDatabase }, { verifyDemoDoctor }] = await Promise.all([
    import('../src/app.js'), import('../src/database/pool.js'),
    import('../scripts/verify-demo-doctor.js'),
  ]);
  const server = await new Promise(resolve => {
    const listener = createApp().listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const licenseNumber = String(Date.now()).slice(-9) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const users = [];
  let patientId;
  let doctorId;
  async function request(method, path, body, token) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  async function account(role, details = {}) {
    const email = details.email ?? `${role.toLowerCase()}.${suffix}@example.invalid`;
    const password = `Workflow-${suffix}!`;
    const registered = await request('POST', '/api/auth/register', {
      email, password, full_name: `${role} Workflow`, role, ...details,
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.data));
    users.push(registered.data.data.user.user_id);
    const loggedIn = await request('POST', '/api/auth/login', { email, password });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.data));
    return loggedIn.data.data.access_token;
  }
  try {
    const patientToken = await account('PATIENT');
    const otherPatientToken = await account('PATIENT', { email: `otherpatient.${suffix}@example.invalid` });
    const doctorToken = await account('DOCTOR', {
      specialization: 'General', license_number: licenseNumber,
    });
    patientId = (await request('GET', '/api/patients/profile', null, patientToken)).data.data.patient.id;
    const otherPatientId = (await request('GET', '/api/patients/profile', null, otherPatientToken)).data.data.patient.id;
    doctorId = (await request('GET', '/api/doctors/profile', null, doctorToken)).data.data.doctor.id;
    assert.equal((await request('GET', '/api/doctors/patients', null, doctorToken)).status, 403);
    const healthDetails = { conditions: 'Asthma', medical_history: 'Childhood hospitalization',
      allergies: 'Penicillin', current_medications: 'Inhaler', notes: 'Exercise can trigger symptoms', blood_group: 'AB-'  };
    const firstHealth = await request('PUT', '/api/patients/health-profile', healthDetails, patientToken);
    assert.equal(firstHealth.status, 200, JSON.stringify(firstHealth.data));
    assert.equal(firstHealth.data.data.profile.patient_id, patientId);
    assert.equal((await request('PUT', '/api/patients/health-profile',
      { ...healthDetails, blood_group: 'Z+' }, patientToken)).status, 400);
    assert.equal((await request('PUT', '/api/patients/health-profile', healthDetails, doctorToken)).status, 403);
    const measurement = { measured_on: new Date().toISOString().slice(0, 10),
      systolic_mmhg: 120, diastolic_mmhg: 80, pulse_bpm: 72, weight_kg: 65.5 };
    const added = await request('POST', '/api/patients/health-profile/measurements', measurement, patientToken);
    assert.equal(added.status, 201, JSON.stringify(added.data));
    const measurementId = added.data.data.measurement.id;
    assert.equal((await request('PATCH', `/api/patients/health-profile/measurements/${measurementId}`,
      { ...measurement, pulse_bpm: 75 }, otherPatientToken)).status, 404);
    assert.equal((await request('PATCH', `/api/patients/health-profile/measurements/${measurementId}`,
      { ...measurement, pulse_bpm: 75 }, doctorToken)).status, 403);
    assert.equal((await request('PATCH', `/api/patients/health-profile/measurements/${measurementId}`,
      { ...measurement, pulse_bpm: 75 }, patientToken)).status, 200);
    assert.equal((await request('POST', '/api/patients/health-profile/measurements',
      { ...measurement, measured_on: '2025-02-30' }, patientToken)).status, 400);
    assert.equal((await request('POST', '/api/patients/health-profile/measurements',
      { ...measurement, systolic_mmhg: null }, patientToken)).status, 400);
    assert.equal((await request('PUT', '/api/patients/health-profile',
      { ...healthDetails, patient_id: otherPatientId }, patientToken)).status, 400);
    assert.equal((await request('GET', '/api/patients/health-profile', null, otherPatientToken))
      .data.data.health.profile, null);
    const revised = await request('PUT', '/api/patients/health-profile',
      { ...healthDetails, allergies: 'Penicillin and pollen' }, patientToken);
    assert.equal(revised.status, 200);
    const refreshedToken = (await request('POST', '/api/auth/login', {
      email: `patient.${suffix}@example.invalid`, password: `Workflow-${suffix}!`,
    })).data.data.access_token;
    const persisted = (await request('GET', '/api/patients/health-profile', null, refreshedToken)).data.data.health;
    assert.equal(persisted.profile.allergies, 'Penicillin and pollen');
    assert.equal(persisted.blood_group, 'AB-');
    assert.equal((await request('GET', '/api/patients/profile', null, refreshedToken)).data.data.patient.blood_group, 'AB-');
    assert.equal(persisted.measurements[0].pulse_bpm, 75);

    const record = await request('POST', '/api/medical-records', {
      patient_id: patientId, diagnosis: 'Workflow diagnosis', notes: 'Demo history',
    }, patientToken);
    assert.equal(record.status, 201, JSON.stringify(record.data));
    const operator = await query(`INSERT INTO public.users (email) VALUES ($1) RETURNING id`,
      [`operator.${suffix}@example.invalid`]);
    const operatorId = operator.rows[0].id;
    users.push(operatorId);
    await query(`INSERT INTO public.profiles (user_id, full_name, role)
      VALUES ($1, 'Workflow operator', 'ADMIN')`, [operatorId]);
    await verifyDemoDoctor({ doctorEmail: `doctor.${suffix}@example.invalid`,
      licenseNumber, operatorEmail: `operator.${suffix}@example.invalid` });

    const beforeGrant = await request('GET', `/api/medical-records/${patientId}`, null, doctorToken);
    assert.equal(beforeGrant.status, 403);
    assert.equal((await request('GET', `/api/doctors/patients/${patientId}/health-profile`, null, doctorToken)).status, 403);
    const grant = await request('POST', '/api/sessions', {
      doctor_id: doctorId, expires_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    }, patientToken);
    assert.equal(grant.status, 201, JSON.stringify(grant.data));
    const connectionId = grant.data.data.session.id;
    const authorized = await request('GET', `/api/medical-records/${patientId}`, null, doctorToken);
    assert.equal(authorized.status, 200, JSON.stringify(authorized.data));
    assert.equal(authorized.data.data.records[0].diagnosis, 'Workflow diagnosis');
    const doctorHealth = await request('GET', `/api/doctors/patients/${patientId}/health-profile`, null, doctorToken);
    assert.equal(doctorHealth.status, 200, JSON.stringify(doctorHealth.data));
    assert.equal(doctorHealth.data.data.health.profile.conditions, 'Asthma');
    assert.equal(doctorHealth.data.data.health.blood_group, 'AB-');
    assert.equal((await request('GET', `/api/doctors/patients/${otherPatientId}/health-profile`, null, doctorToken)).status, 403);
    const withoutConsultation = await request('POST', '/api/doctors/prescriptions', {
      patient_id: patientId, medicine: 'Example medicine', dosage: 'Once daily',
      instructions: 'After food',
    }, doctorToken);
    assert.equal(withoutConsultation.status, 403, JSON.stringify(withoutConsultation.data));
    const prescriptions = await request('GET', '/api/patients/prescriptions', null, patientToken);
    assert.equal(prescriptions.status, 200);
    assert.equal(prescriptions.data.data.prescriptions.length, 0);
    const logs = await request('GET', '/api/patients/access-logs', null, patientToken);
    assert.equal(logs.status, 200);
    assert.ok(logs.data.data.logs.some(item => item.action === 'RECORDS_READ'));
    assert.ok(logs.data.data.logs.some(item => item.action === 'HEALTH_PROFILE_READ'));

    assert.equal((await request('PATCH', `/api/sessions/${connectionId}/revoke`, {}, patientToken)).status, 200);
    assert.equal((await request('GET', `/api/medical-records/${patientId}`, null, doctorToken)).status, 403);
    assert.equal((await request('GET', `/api/doctors/patients/${patientId}/health-profile`, null, doctorToken)).status, 403);
    assert.equal((await request('GET', '/api/patients/records', null, patientToken)).data.data.records[0].title,
      'Workflow diagnosis');
    assert.equal((await request('GET', '/api/patients/prescriptions', null, patientToken))
      .data.data.prescriptions.length, 0);
    assert.equal((await request('POST', '/api/doctors/prescriptions', {
      patient_id: patientId, medicine: 'Blocked', dosage: 'Once daily', instructions: 'None',
    }, doctorToken)).status, 403);
  } finally {
    if (patientId && doctorId) {
      await query('DELETE FROM public.prescriptions WHERE patient_id = $1 OR doctor_id = $2', [patientId, doctorId]);
      await query('DELETE FROM public.medical_records WHERE patient_id = $1', [patientId]);
    }
    for (const id of users.reverse()) await query('DELETE FROM public.users WHERE id = $1', [id]);
    await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  }
});
