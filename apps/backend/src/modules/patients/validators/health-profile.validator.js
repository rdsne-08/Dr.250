import { HttpError } from '../../../middleware/http-error.js';

function fail(message) { throw new HttpError(400, message, { code: 'VALIDATION_ERROR' }); }
function object(body, keys) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !keys.includes(key))) fail('Invalid health profile fields.');
}
function text(body, key, max) {
  if (typeof body[key] !== 'string' || body[key].length > max) fail(`${key} must be text under ${max} characters.`);
  return body[key].trim();
}
function number(body, key, min, max, integer = true) {
  if (body[key] === null) return null;
  if (typeof body[key] !== 'number' || !Number.isFinite(body[key])
    || (integer && !Number.isInteger(body[key])) || body[key] < min || body[key] > max) {
    fail(`${key} is outside its supported range.`);
  }
  return body[key];
}

export function parseHealthProfile(body) {
  const keys = ['conditions', 'allergies', 'current_medications', 'medical_history', 'notes'];
  object(body, [...keys, 'blood_group']);
  if ([...keys, 'blood_group'].some(key => !Object.hasOwn(body, key))) fail('Provide all health profile fields.');
  const bloodGroup = body.blood_group;
  if (bloodGroup !== null && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].includes(bloodGroup)) {
    fail('blood_group must be a supported value.');
  }
  return { ...Object.fromEntries(keys.map(key => [key, text(body, key, key === 'medical_history' || key === 'notes' ? 5000 : 3000)])),
    bloodGroup };
}

export function parseHealthMeasurement(body) {
  const keys = ['measured_on', 'systolic_mmhg', 'diastolic_mmhg', 'pulse_bpm', 'weight_kg'];
  object(body, keys);
  if (keys.some(key => !Object.hasOwn(body, key))) fail('Provide all measurement fields.');
  const date = body.measured_on;
  const parsed = typeof date === 'string' ? new Date(`${date}T00:00:00.000Z`) : null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(parsed?.getTime()) || parsed.toISOString().slice(0, 10) !== date
    || date > new Date().toISOString().slice(0, 10)) fail('Enter a valid measurement date on or before today.');
  const systolic = number(body, 'systolic_mmhg', 40, 300);
  const diastolic = number(body, 'diastolic_mmhg', 20, 200);
  const pulse = number(body, 'pulse_bpm', 20, 250);
  const weight = number(body, 'weight_kg', 1, 500, false);
  if ((systolic === null) !== (diastolic === null) || (systolic !== null && systolic <= diastolic)) {
    fail('Enter both blood pressure values, with systolic above diastolic.');
  }
  if (systolic === null && pulse === null && weight === null) fail('Enter at least one measurement.');
  return { measured_on: date, systolic_mmhg: systolic, diastolic_mmhg: diastolic,
    pulse_bpm: pulse, weight_kg: weight };
}

export function validateHealthProfile(request, _response, next) {
  try { request.validatedHealthProfile = parseHealthProfile(request.body); next(); }
  catch (error) { next(error); }
}
export function validateHealthMeasurement(request, _response, next) {
  try { request.validatedHealthMeasurement = parseHealthMeasurement(request.body); next(); }
  catch (error) { next(error); }
}
