import assert from 'node:assert/strict';
import test from 'node:test';

const disposable = process.env.AUTH_INTEGRATION_URL;
if (disposable) process.env.DATABASE_URL = disposable;

test('doctor profile and chamber-date availability persist and stay owned and verified', {
  skip: !disposable && 'Set AUTH_INTEGRATION_URL to a migrated disposable loopback dr250_release_* database.',
}, async () => {
  const url = new URL(disposable);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const [{ createApp }, { query, closeDatabase }, { verifyEntity },
    { getTodayAvailability, saveTodayAvailability }] = await Promise.all([
    import('../src/app.js'), import('../src/database/pool.js'),
    import('../src/modules/admin/services/admin.service.js'),
    import('../src/modules/doctors/services/doctor.service.js'),
  ]);
  const server = await new Promise(resolve => {
    const listener = createApp().listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const suffix = Date.now();
  const password = 'Practice-test-123!';
  const users = [];
  async function request(method, path, body, token) {
    const response = await fetch(base + path, { method, headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  async function doctorAccount(name, license) {
    const email = `${name}.${suffix}@example.invalid`;
    const registration = await request('POST', '/api/auth/register', {
      email, password, full_name: name, role: 'DOCTOR',
      specialization: 'General medicine', license_number: license,
    });
    assert.equal(registration.status, 202, JSON.stringify(registration.data));
    const signedIn = (await request('POST', '/api/auth/login', { email, password })).data.data;
    users.push(signedIn.user.user_id);
    const token = signedIn.access_token;
    const profile = (await request('GET', '/api/doctors/profile', null, token)).data.data.doctor;
    return { email, token, doctor: profile };
  }
  const details = {
    full_name: 'Updated Doctor', specialization: 'Cardiology', qualifications: 'MBBS, MD',
    years_experience: 0, biography: 'Adult cardiology and preventive care.',
    chamber_name: 'Green Chamber', chamber_address: '12 Care Road', city: 'Dhaka',
    practice_country: 'BD', practice_timezone: 'Asia/Dhaka',
    consultation_start: '09:00', consultation_end: '17:00',
    consultation_fee: '750.00', consultation_currency: 'BDT',
  };
  try {
    const first = await doctorAccount('first', String(suffix).slice(-9));
    const second = await doctorAccount('second', String(suffix + 1).slice(-9));
    const incomplete = await doctorAccount('incomplete', String(suffix + 2).slice(-9));
    const operator = (await query('INSERT INTO public.users (email) VALUES ($1) RETURNING id',
      [`operator.${suffix}@example.invalid`])).rows[0];
    users.push(operator.id);
    await query("INSERT INTO public.profiles (user_id,full_name,role) VALUES ($1,'Test operator','ADMIN')", [operator.id]);
    const options = await request('GET', '/api/doctors/profile-options', null, first.token);
    assert.equal(options.status, 200);
    assert.ok(options.data.data.countries.some(country => country.code === 'BD'));
    assert.ok(options.data.data.timezonesByCountry.BD.includes('Asia/Dhaka'));
    assert.equal((await request('PUT', '/api/doctors/availability/today', {
      available: true, max_patients: 10, consultation_start: '09:00', consultation_end: '17:00', booking_start: '08:00', booking_end: '11:00',
    }, first.token)).status, 403);
    for (const invalid of [
      { qualifications: '' }, { years_experience: -1 }, { years_experience: 2.5 },
      { practice_country: 'XX' }, { practice_timezone: 'Europe/London' },
      { consultation_fee: '-1' }, { consultation_currency: 'ZZZ' },
      { consultation_start: '18:00' }, { license_number: '999999' },
      { verification_status: 'VERIFIED' }, { role: 'ADMIN' }, { doctor_id: second.doctor.id },
    ]) {
      const result = await request('PUT', '/api/doctors/profile', { ...details, ...invalid }, first.token);
      assert.equal(result.status, 400, JSON.stringify({ invalid, response: result.data }));
    }
    assert.equal((await request('GET', '/api/doctors/profile', null, first.token)).data.data.doctor.full_name, 'first');
    const saved = await request('PUT', '/api/doctors/profile', details, first.token);
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.data.doctor.full_name, 'Updated Doctor');
    assert.equal(saved.data.data.doctor.license_number, first.doctor.license_number);
    assert.equal(saved.data.data.doctor.verification_status, 'PENDING');
    const newToken = (await request('POST', '/api/auth/login', { email: first.email, password })).data.data.access_token;
    assert.equal((await request('GET', '/api/doctors/profile', null, newToken)).data.data.doctor.chamber_name, 'Green Chamber');
    assert.equal((await request('GET', '/api/doctors/profile?doctor_id=' + second.doctor.id, null, newToken)).data.data.doctor.id, first.doctor.id);
    assert.equal((await request('GET', '/api/doctors/profile', null, second.token)).data.data.doctor.full_name, 'second');
    await verifyEntity({ id: first.doctor.id, entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: operator.id });
    await verifyEntity({ id: incomplete.doctor.id, entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: operator.id });
    assert.equal((await request('PUT', '/api/doctors/availability/today', {
      available: true, max_patients: 10, consultation_start: '09:00', consultation_end: '17:00', booking_start: '08:00', booking_end: '11:00',
    }, incomplete.token)).status, 400);
    await verifyEntity({ id: second.doctor.id, entityType: 'DOCTOR', status: 'REJECTED', adminUserId: operator.id });
    const today = (await request('GET', '/api/doctors/availability/today', null, newToken)).data.data.availability;
    assert.equal(today.configured, false);
    assert.match(today.local_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal((await request('PUT', '/api/doctors/availability/today', {
      local_date: today.local_date, available: true, max_patients: 101,
      consultation_start: '09:00', consultation_end: '17:00', booking_start: '08:00', booking_end: '11:00',
    }, newToken)).status, 400);
    assert.equal((await request('PUT', '/api/doctors/availability/today', {
      local_date: today.local_date, available: true, max_patients: 10,
      consultation_start: '18:00', consultation_end: '17:00', booking_start: '08:00', booking_end: '11:00',
    }, newToken)).status, 400);
    for (const [booking_start, booking_end] of [['11:00', '08:00'], ['08:00', null], ['25:00', '26:00']]) {
      assert.equal((await request('PUT', '/api/doctors/availability/today', {
        local_date: today.local_date, available: true, max_patients: 10,
        consultation_start: '09:00', consultation_end: '17:00', booking_start, booking_end,
      }, newToken)).status, 400);
    }
    assert.equal((await request('PUT', '/api/doctors/availability/today', {
      local_date: '2000-01-01', available: true, max_patients: 10,
      consultation_start: '09:00', consultation_end: '17:00', booking_start: '08:00', booking_end: '11:00',
    }, newToken)).status, 409);
    const available = await request('PUT', '/api/doctors/availability/today', {
      local_date: today.local_date, available: true, max_patients: 12,
      consultation_start: '10:00', consultation_end: '16:00', booking_start: '08:00', booking_end: '11:00',
    }, newToken);
    assert.equal(available.status, 200, JSON.stringify(available.data));
    assert.equal(available.data.data.availability.max_patients, 12);
    assert.equal(available.data.data.availability.booking_start, '08:00');
    assert.equal((await request('GET', '/api/doctors/availability/today', null, newToken)).data.data.availability.available, true);
    assert.equal((await request('GET', '/api/doctors/availability/today', null, second.token)).data.data.availability.configured, false);
    const tomorrow = await getTodayAvailability(users[0], undefined, new Date(Date.now() + 86400000));
    assert.equal(tomorrow.configured, false);
    assert.notEqual(tomorrow.local_date, today.local_date);
    await assert.rejects(saveTodayAvailability(users[0], { localDate: today.local_date,
      available: true, maxPatients: 12, consultationStart: '10:00', consultationEnd: '16:00',
    }, undefined, new Date(Date.now() + 86400000)), error => error.statusCode === 409);
    assert.equal((await request('PUT', '/api/doctors/availability/today', {
      available: true, max_patients: 10, consultation_start: '09:00', consultation_end: '17:00', booking_start: '08:00', booking_end: '11:00',
    }, second.token)).status, 403);
    const unavailable = await request('PUT', '/api/doctors/availability/today', {
      local_date: today.local_date, available: false, max_patients: 12,
      consultation_start: '10:00', consultation_end: '16:00', booking_start: '08:00', booking_end: '11:00',
    }, newToken);
    assert.equal(unavailable.status, 200);
    assert.equal(unavailable.data.data.availability.available, false);
  } finally {
    for (const id of users.reverse()) await query('DELETE FROM public.users WHERE id=$1', [id]);
    await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  }
});
