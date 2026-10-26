import { HttpError } from '../../../middleware/http-error.js';
import { COUNTRY_CODES, CURRENCY_CODES, timezonesForCountry } from '../services/practice-options.js';

function fail(field, message) {
  throw new HttpError(400, `${field} ${message}.`, { code: 'VALIDATION_ERROR' });
}
function object(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Request', 'must be a JSON object');
  return body;
}
function allowed(body, fields) {
  for (const key of Object.keys(body)) if (!fields.includes(key)) fail(key, 'cannot be changed here');
}
function text(body, field, max) {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    fail(field, `must contain 1 to ${max} characters`);
  }
  return value.trim();
}
function time(value, field, optional = false) {
  if (optional && (value === null || value === '' || value === undefined)) return null;
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail(field, 'must be HH:MM');
  return value;
}
function hours(start, end) {
  if (start && end && start >= end) fail('Consultation end', 'must be later than start');
}

const profileFields = ['full_name', 'specialization', 'qualifications', 'years_experience',
  'biography', 'chamber_name', 'chamber_address', 'city', 'practice_country',
  'practice_timezone', 'consultation_start', 'consultation_end', 'consultation_fee',
  'consultation_currency'];

export function parseProfessionalProfile(input) {
  const body = object(input);
  allowed(body, profileFields);
  const country = text(body, 'practice_country', 2).toUpperCase();
  if (!COUNTRY_CODES.has(country)) fail('practice_country', 'must be an assigned ISO alpha-2 code');
  const timezone = text(body, 'practice_timezone', 64);
  if (!timezonesForCountry(country).includes(timezone)) {
    fail('practice_timezone', 'must be an IANA time zone for the practice country');
  }
  const currency = text(body, 'consultation_currency', 3).toUpperCase();
  if (!CURRENCY_CODES.has(currency)) fail('consultation_currency', 'must be an ISO currency code');
  const experience = body.years_experience;
  if (!Number.isInteger(experience) || experience < 0 || experience > 2147483647) {
    fail('years_experience', 'must be a non-negative integer');
  }
  const fee = String(body.consultation_fee ?? '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(fee)) fail('consultation_fee', 'must be a non-negative amount with up to two decimals');
  const start = time(body.consultation_start, 'consultation_start');
  const end = time(body.consultation_end, 'consultation_end');
  hours(start, end);
  return {
    fullName: text(body, 'full_name', 120),
    specialization: text(body, 'specialization', 120),
    qualifications: text(body, 'qualifications', 500),
    yearsExperience: experience,
    biography: text(body, 'biography', 2000),
    chamberName: text(body, 'chamber_name', 160),
    chamberAddress: text(body, 'chamber_address', 300),
    city: text(body, 'city', 120),
    practiceCountry: country,
    practiceTimezone: timezone,
    consultationStart: start,
    consultationEnd: end,
    consultationFee: fee,
    consultationCurrency: currency,
  };
}

export function parseTodayAvailability(input) {
  const body = object(input);
  allowed(body, ['available', 'max_patients', 'consultation_start', 'consultation_end', 'local_date']);
  if (body.local_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.local_date)) {
    fail('local_date', 'must be YYYY-MM-DD');
  }
  if (typeof body.available !== 'boolean') fail('available', 'must be true or false');
  const capacity = body.max_patients === null || body.max_patients === '' ? null : body.max_patients;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100)) {
    fail('max_patients', 'must be an integer from 1 to 100');
  }
  const start = time(body.consultation_start, 'consultation_start', true);
  const end = time(body.consultation_end, 'consultation_end', true);
  if (body.available && (capacity === null || !start || !end)) {
    fail('Available today', 'requires capacity and consultation hours');
  }
  if (Boolean(start) !== Boolean(end)) fail('Consultation hours', 'must include both start and end');
  hours(start, end);
  return { available: body.available, localDate: body.local_date, maxPatients: capacity,
    consultationStart: start, consultationEnd: end };
}

export function validateProfessionalProfile(request, _response, next) {
  try { request.validatedBody = parseProfessionalProfile(request.body); next(); }
  catch (error) { next(error); }
}
export function validateTodayAvailability(request, _response, next) {
  try { request.validatedBody = parseTodayAvailability(request.body); next(); }
  catch (error) { next(error); }
}
