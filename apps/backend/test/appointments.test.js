import assert from 'node:assert/strict';
import test from 'node:test';

const disposable = process.env.AUTH_INTEGRATION_URL;
if (disposable) process.env.DATABASE_URL = disposable;

test('same-day booking enforces identity, country, window, capacity and permanent queue numbers', {
  skip: !disposable && 'Set AUTH_INTEGRATION_URL to a migrated disposable loopback dr250_release_* database.',
}, async () => {
  const url = new URL(disposable);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.match(url.pathname, /^\/dr250_release_[a-z_]+$/);
  const [{ createApp }, { query, closeDatabase }, { verifyEntity },
    { saveTodayAvailability, localDateForTimezone },
    { bookAppointment, cancelAppointment, doctorTodayQueue },
    { requestCare, decideCare, completeConsultation, activeConsultation }] = await Promise.all([
    import('../src/app.js'), import('../src/database/pool.js'),
    import('../src/modules/admin/services/admin.service.js'),
    import('../src/modules/doctors/services/doctor.service.js'),
    import('../src/modules/appointments/appointment.service.js'),
    import('../src/modules/appointments/consultation.service.js'),
  ]);
  const server = await new Promise(resolve => {
    const listener = createApp().listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const suffix = Date.now();
  const password = 'Booking-test-123!';
  const users = [];
  let prescriptionId;
  async function request(method, path, body, token) {
    const response = await fetch(base + path, { method, headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  async function account(name, role) {
    const email = `${name}.${suffix}@example.invalid`;
    const body = { email, password, full_name: name, role,
      ...(role === 'DOCTOR' ? { specialization: 'General medicine',
        license_number: String(suffix + users.length).slice(-9) } : {}) };
    const registration = await request('POST', '/api/auth/register', body);
    assert.equal(registration.status, 202, JSON.stringify(registration.data));
    const signedIn = (await request('POST', '/api/auth/login', { email, password })).data.data;
    const id = signedIn.user.user_id;
    users.push(id);
    const token = signedIn.access_token;
    const endpoint = role === 'DOCTOR' ? '/api/doctors/profile' : '/api/patients/profile';
    const profile = (await request('GET', endpoint, null, token)).data.data[role === 'DOCTOR' ? 'doctor' : 'patient'];
    return { id, token, profile };
  }
  const details = {
    full_name: 'Booking Doctor', specialization: 'Cardiology', qualifications: 'MBBS',
    years_experience: 5, biography: 'In-person chamber consultations.',
    chamber_name: 'Green Chamber', chamber_address: '12 Care Road', city: 'Dhaka',
    practice_country: 'BD', practice_timezone: 'Asia/Dhaka',
    consultation_start: '09:00', consultation_end: '17:00',
    consultation_fee: '500.00', consultation_currency: 'BDT',
  };
  try {
    const doctor = await account('bookingdoctor', 'DOCTOR');
    const otherDoctor = await account('otherdoctor', 'DOCTOR');
    const foreignDoctor = await account('foreigndoctor', 'DOCTOR');
    const rejectedDoctor = await account('rejecteddoctor', 'DOCTOR');
    const incompleteDoctor = await account('incompletdoctor', 'DOCTOR');
    const pendingDoctor = await account('pendingdoctor', 'DOCTOR');
    const unavailableDoctor = await account('unavailabledoctor', 'DOCTOR');
    const patients = await Promise.all(['one', 'two', 'three', 'four'].map(name => account(name, 'PATIENT')));
    const operator = (await query('INSERT INTO public.users(email) VALUES ($1) RETURNING id',
      [`operator.${suffix}@example.invalid`])).rows[0];
    users.push(operator.id);
    await query("INSERT INTO public.profiles(user_id,full_name,role) VALUES ($1,'Operator','ADMIN')", [operator.id]);
    await verifyEntity({ id: doctor.profile.id, entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: operator.id });
    await verifyEntity({ id: otherDoctor.profile.id, entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: operator.id });
    await verifyEntity({ id: foreignDoctor.profile.id, entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: operator.id });
    await verifyEntity({ id: rejectedDoctor.profile.id, entityType: 'DOCTOR', status: 'REJECTED', adminUserId: operator.id });
    await verifyEntity({ id: incompleteDoctor.profile.id, entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: operator.id });
    await verifyEntity({ id: unavailableDoctor.profile.id, entityType: 'DOCTOR', status: 'VERIFIED', adminUserId: operator.id });
    assert.equal((await request('PUT', '/api/doctors/profile', details, doctor.token)).status, 200);
    assert.equal((await request('PUT', '/api/doctors/profile', {
      ...details, full_name: 'Other Doctor',
    }, otherDoctor.token)).status, 200);
    assert.equal((await request('PUT', '/api/doctors/profile', {
      ...details, full_name: 'Foreign Doctor', practice_country: 'US',
      practice_timezone: 'America/New_York', consultation_currency: 'USD',
    }, foreignDoctor.token)).status, 200);
    assert.equal((await request('PUT', '/api/doctors/profile', details, rejectedDoctor.token)).status, 200);
    assert.equal((await request('PUT', '/api/doctors/profile', details, pendingDoctor.token)).status, 200);
    assert.equal((await request('PUT', '/api/doctors/profile', details, unavailableDoctor.token)).status, 200);
    assert.equal((await request('GET', '/api/appointments/doctors', null, patients[0].token)).data.data.doctors.length, 0);
    const today = localDateForTimezone('Asia/Dhaka');
    const ten = new Date(`${today}T04:00:00.000Z`);
    const early = new Date(`${today}T01:59:00.000Z`);
    const late = new Date(`${today}T05:00:00.000Z`);
    await saveTodayAvailability(doctor.id, { available: true, maxPatients: 2,
      consultationStart: '09:00', consultationEnd: '17:00', localDate: today });
    await saveTodayAvailability(doctor.id, { available: true, maxPatients: 2,
      consultationStart: '09:00', consultationEnd: '17:00', bookingStart: '08:00', bookingEnd: '11:00', localDate: today });
    await saveTodayAvailability(otherDoctor.id, { available: true, maxPatients: 2,
      consultationStart: '09:00', consultationEnd: '17:00', bookingStart: '09:00', bookingEnd: '12:00', localDate: today });
    await saveTodayAvailability(foreignDoctor.id, { available: true, maxPatients: 2,
      consultationStart: '09:00', consultationEnd: '17:00', bookingStart: '09:00', bookingEnd: '12:00',
      localDate: localDateForTimezone('America/New_York') });
    await saveTodayAvailability(rejectedDoctor.id, { available: false, maxPatients: 2,
      consultationStart: '09:00', consultationEnd: '17:00', localDate: today });
    await saveTodayAvailability(unavailableDoctor.id, { available: false, maxPatients: 2,
      consultationStart: '09:00', consultationEnd: '17:00', bookingStart: '09:00', bookingEnd: '12:00', localDate: today });
    assert.equal((await request('POST', '/api/appointments', { doctor_id: doctor.profile.id,
      local_date: today }, patients[0].token)).status, 400);
    for (const patient of patients.slice(0, 3)) {
      assert.equal((await request('PATCH', '/api/patients/profile/country', {
        country_code: 'BD',
      }, patient.token)).status, 200);
    }
    await query('UPDATE public.doctor_daily_availability SET booking_start=NULL, booking_end=NULL WHERE doctor_id=$1 AND local_date=$2', [doctor.profile.id, today]);
    await assert.rejects(bookAppointment(patients[0].id, doctor.profile.id, today, undefined, ten),
      error => error.statusCode === 409 && /not configured/.test(error.message));
    await query("UPDATE public.doctor_daily_availability SET booking_start='08:00', booking_end='11:00' WHERE doctor_id=$1 AND local_date=$2", [doctor.profile.id, today]);
    const discovery = await request('GET', '/api/appointments/doctors', null, patients[0].token);
    assert.equal(discovery.status, 200, JSON.stringify(discovery.data));
    assert.deepEqual(new Set(discovery.data.data.doctors.map(item => item.id)),
      new Set([doctor.profile.id, otherDoctor.profile.id]));
    assert.equal(discovery.data.data.doctors[0].remaining_capacity, 2);
    assert.ok(discovery.data.data.doctors.some(item => item.booking_start === '08:00' && item.booking_end === '11:00'));
    await assert.rejects(bookAppointment(patients[0].id, doctor.profile.id, today, undefined, early),
      error => error.statusCode === 409);
    await assert.rejects(bookAppointment(patients[0].id, doctor.profile.id, today, undefined, late),
      error => error.statusCode === 409);
    await assert.rejects(bookAppointment(patients[3].id, doctor.profile.id, today, undefined, ten),
      error => error.statusCode === 400);
    await assert.rejects(bookAppointment(patients[0].id, rejectedDoctor.profile.id, today, undefined, ten),
      error => error.statusCode === 404);
    await assert.rejects(bookAppointment(patients[0].id, pendingDoctor.profile.id, today, undefined, ten),
      error => error.statusCode === 404);
    await assert.rejects(bookAppointment(patients[0].id, unavailableDoctor.profile.id, today, undefined, ten),
      error => error.statusCode === 409);
    await assert.rejects(bookAppointment(patients[0].id, incompleteDoctor.profile.id, today, undefined, ten),
      error => error.statusCode === 404);
    await assert.rejects(bookAppointment(patients[0].id, foreignDoctor.profile.id, today, undefined, ten),
      error => error.statusCode === 403);
    const first = await bookAppointment(patients[0].id, doctor.profile.id, today, undefined, ten);
    assert.equal(first.queue_position, 1);
    assert.equal((await request('PUT', '/api/patients/health-profile', {
      conditions: 'Asthma', allergies: 'Pollen', current_medications: 'Inhaler',
      medical_history: 'Childhood symptoms', notes: 'Self-reported', blood_group: 'A+',
    }, patients[0].token)).status, 200);
    assert.equal((await request('GET', `/api/doctors/patients/${patients[0].profile.id}/health-profile`,
      null, doctor.token)).status, 403);
    assert.equal((await request('GET', `/api/medical-records/${patients[0].profile.id}`, null, doctor.token)).status, 403);
    assert.equal((await request('POST', '/api/doctors/prescriptions', {
      patient_id: patients[0].profile.id, medicine: 'Test', dosage: 'One', instructions: 'Test',
    }, doctor.token)).status, 403);
    await assert.rejects(bookAppointment(patients[0].id, doctor.profile.id, today, undefined, ten),
      error => error.statusCode === 409);
    await assert.rejects(bookAppointment(patients[0].id, otherDoctor.profile.id, today, undefined, ten),
      error => error.statusCode === 409);
    const concurrent = await Promise.allSettled([patients[1], patients[2]].map(patient =>
      bookAppointment(patient.id, doctor.profile.id, today, undefined, ten)));
    assert.equal(concurrent.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(concurrent.find(item => item.status === 'fulfilled').value.queue_position, 2);
    await assert.rejects(saveTodayAvailability(doctor.id, { available: true, maxPatients: 1,
      consultationStart: '09:00', consultationEnd: '17:00', bookingStart: '09:00', bookingEnd: '12:00', localDate: today }),
    error => error.statusCode === 409);
    assert.equal((await doctorTodayQueue(doctor.id)).active_count, 2);
    assert.equal((await doctorTodayQueue(otherDoctor.id)).appointments.length, 0);
    await assert.rejects(cancelAppointment(patients[1].id, first.id), error => error.statusCode === 404);
    assert.equal((await cancelAppointment(patients[0].id, first.id)).status, 'CANCELLED');
    const third = await bookAppointment(patients[0].id, doctor.profile.id, today, undefined, ten);
    assert.equal(third.queue_position, 3);
    assert.deepEqual((await doctorTodayQueue(doctor.id)).appointments.map(item => item.queue_position), [1, 2, 3]);
    assert.equal((await doctorTodayQueue(doctor.id)).remaining_capacity, 0);
    const history = (await request('GET', '/api/appointments', null, patients[0].token)).data.data.appointments;
    assert.equal(history.length, 2);
    assert.deepEqual(new Set(history.map(item => item.status)), new Set(['BOOKED', 'CANCELLED']));
    assert.equal((await request('GET', '/api/appointments', null, patients[1].token)).data.data.appointments.length <= 1, true);
    assert.equal((await request('GET', '/api/doctors/queue/today', null, doctor.token)).data.data.queue.active_count, 2);
    assert.equal((await request('GET', '/api/doctors/queue/today', null, otherDoctor.token)).data.data.queue.appointments.length, 0);
    await assert.rejects(requestCare(patients[1].id, third.id, undefined, ten),
      error => error.statusCode === 404);
    await assert.rejects(requestCare(patients[0].id, first.id, undefined, ten),
      error => error.statusCode === 409);
    await assert.rejects(requestCare(patients[0].id, third.id, undefined,
      new Date(ten.getTime() + 24 * 60 * 60_000)), error => error.statusCode === 409);
    await query("UPDATE public.doctors SET verification_status='REJECTED' WHERE id=$1", [doctor.profile.id]);
    await assert.rejects(requestCare(patients[0].id, third.id, undefined, ten),
      error => error.statusCode === 403);
    await query("UPDATE public.doctors SET verification_status='VERIFIED' WHERE id=$1", [doctor.profile.id]);
    assert.equal((await requestCare(patients[0].id, third.id, undefined, ten)).consultation_status, 'PENDING');
    await assert.rejects(requestCare(patients[0].id, third.id, undefined, ten),
      error => error.statusCode === 409);
    await assert.rejects(decideCare(otherDoctor.id, third.id, 'accept', undefined, ten),
      error => error.statusCode === 404);
    assert.equal((await decideCare(doctor.id, third.id, 'decline', undefined, ten)).consultation_status, 'DECLINED');
    assert.equal((await request('GET', '/api/appointments', null, patients[0].token)).data.data.appointments
      .find(item => item.id === third.id).consultation_status, 'DECLINED');
    await requestCare(patients[0].id, third.id, undefined, ten);
    assert.equal((await decideCare(doctor.id, third.id, 'accept', undefined, ten)).consultation_status, 'ACTIVE');
    await assert.rejects(decideCare(doctor.id, third.id, 'accept', undefined, ten),
      error => error.statusCode === 409);
    const secondOwner = concurrent[0].status === 'fulfilled' ? patients[1] : patients[2];
    const secondId = concurrent.find(item => item.status === 'fulfilled').value.id;
    await requestCare(secondOwner.id, secondId, undefined, ten);
    await assert.rejects(decideCare(doctor.id, secondId, 'accept', undefined, ten),
      error => error.statusCode === 409);
    assert.equal((await request('GET', `/api/doctors/consultations/${third.id}`, null, otherDoctor.token)).status, 403);
    const opened = await activeConsultation({ id: doctor.id, role: 'DOCTOR' }, third.id);
    assert.equal(opened.patient_id, patients[0].profile.id);
    assert.equal(opened.health.profile.conditions, 'Asthma');
    assert.equal((await request('GET', `/api/medical-records/${patients[0].profile.id}`, null, doctor.token)).status, 200);
    const saved = await request('POST', '/api/doctors/prescriptions', {
      patient_id: patients[0].profile.id, medicine: 'Consultation medicine',
      dosage: 'Once daily', instructions: 'After food',
    }, doctor.token);
    assert.equal(saved.status, 201, JSON.stringify(saved.data));
    prescriptionId = saved.data.data.prescription.id;
    assert.equal(saved.data.data.prescription.appointment_id, third.id);
    await assert.rejects(query('UPDATE public.prescriptions SET medicine=$2 WHERE id=$1',
      [prescriptionId, 'Altered medicine']), error => error.code === 'P0001');
    assert.equal((await request('POST', '/api/doctors/prescriptions', {
      patient_id: patients[0].profile.id, medicine: 'Consultation medicine',
      dosage: 'Once daily', instructions: 'After food',
    }, doctor.token)).status, 409);
    assert.equal((await request('GET', '/api/patients/prescriptions', null, patients[0].token)).data.data.prescriptions
      .some(item => item.id === prescriptionId), true);
    assert.equal((await completeConsultation(doctor.id, third.id)).consultation_status, 'COMPLETED');
    assert.equal((await request('GET', `/api/medical-records/${patients[0].profile.id}`, null, doctor.token)).status, 403);
    assert.equal((await request('GET', `/api/doctors/patients/${patients[0].profile.id}/health-profile`,
      null, doctor.token)).status, 403);
    assert.equal((await request('POST', '/api/doctors/prescriptions', {
      patient_id: patients[0].profile.id, medicine: 'Blocked', dosage: 'Once', instructions: 'None',
    }, doctor.token)).status, 403);
    await assert.rejects(requestCare(patients[0].id, third.id, undefined, ten),
      error => error.statusCode === 409);
    const completed = (await request('GET', '/api/appointments', null, patients[0].token)).data.data.appointments
      .find(item => item.id === third.id);
    assert.equal(completed.consultation_status, 'COMPLETED');
    assert.equal(completed.visit_prescriptions[0].id, prescriptionId);
    const renewedToken = (await request('POST', '/api/auth/login', {
      email: `one.${suffix}@example.invalid`, password,
    })).data.data.access_token;
    assert.equal((await request('GET', '/api/appointments', null, renewedToken)).data.data.appointments
      .find(item => item.id === third.id).visit_prescriptions[0].id, prescriptionId);
    await decideCare(doctor.id, secondId, 'decline', undefined, ten);
    assert.equal((await request('PATCH', '/api/patients/profile/country', {
      country_code: 'BD',
    }, patients[3].token)).status, 200);
    const revocable = await bookAppointment(patients[3].id, otherDoctor.profile.id, today, undefined, ten);
    await requestCare(patients[3].id, revocable.id, undefined, ten);
    await decideCare(otherDoctor.id, revocable.id, 'accept', undefined, ten);
    const grant = (await query('SELECT id FROM public.access_sessions WHERE appointment_id=$1',
      [revocable.id])).rows[0];
    assert.equal((await request('PATCH', `/api/sessions/${grant.id}/revoke`, {}, patients[3].token)).status, 200);
    assert.equal((await request('GET', `/api/doctors/consultations/${revocable.id}`, null, otherDoctor.token)).status, 403);
    assert.equal((await request('GET', `/api/medical-records/${patients[3].profile.id}`, null, otherDoctor.token)).status, 403);
    assert.equal((await request('POST', '/api/doctors/prescriptions', {
      patient_id: patients[3].profile.id, medicine: 'Blocked', dosage: 'Once', instructions: 'None',
    }, otherDoctor.token)).status, 403);
    await completeConsultation(otherDoctor.id, revocable.id);
  } finally {
    if (prescriptionId) await query('DELETE FROM public.prescriptions WHERE id=$1', [prescriptionId]);
    for (const id of users.reverse()) await query('DELETE FROM public.users WHERE id=$1', [id]);
    await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  }
});
