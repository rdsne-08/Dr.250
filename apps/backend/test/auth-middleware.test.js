import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpError } from '../src/middleware/http-error.js';
import { requireRole } from '../src/modules/auth/middleware/requireRole.js';
import {
  validateLogin,
  validateRegistration,
} from '../src/modules/auth/middleware/validation.js';

function runValidation(middleware, body) {
  const request = { body };
  let nextError;

  middleware(request, {}, (error) => {
    nextError = error;
  });

  return { request, error: nextError };
}

test('registration validation normalizes accepted input', () => {
  const { request, error } = runValidation(validateRegistration, {
    email: ' User@Example.COM ',
    password: 'a-secure-password',
    full_name: ' Example User ',
    role: 'patient',
  });

  assert.equal(error, undefined);
  assert.deepEqual(request.validatedBody, {
    email: 'user@example.com',
    password: 'a-secure-password',
    fullName: 'Example User',
    role: 'PATIENT',
  });
});

test('registration validation rejects unsupported roles', () => {
  const { error } = runValidation(validateRegistration, {
    email: 'user@example.com',
    password: 'a-secure-password',
    full_name: 'Example User',
    role: 'SUPERUSER',
  });

  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 400);
});

test('laboratory registration requires and normalizes laboratory details', () => {
  const { request, error } = runValidation(validateRegistration, {
    email: 'lab@example.com',
    password: 'a-secure-password',
    full_name: 'Lab Operator',
    role: 'lab',
    lab_name: ' Dhaka Diagnostics ',
    license_number: ' DGHS-1234 ',
  });

  assert.equal(error, undefined);
  assert.equal(request.validatedBody.role, 'LAB');
  assert.equal(request.validatedBody.labName, 'Dhaka Diagnostics');
  assert.equal(request.validatedBody.licenseNumber, 'DGHS-1234');
});

test('public registration rejects administrator accounts', () => {
  const { error } = runValidation(validateRegistration, {
    email: 'admin@example.com',
    password: 'a-secure-password',
    full_name: 'Example Admin',
    role: 'ADMIN',
  });

  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 400);
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('login validation never trims or transforms passwords', () => {
  const { request, error } = runValidation(validateLogin, {
    email: 'user@example.com',
    password: '  password  ',
  });

  assert.equal(error, undefined);
  assert.equal(request.validatedBody.password, '  password  ');
});

test('role middleware allows the configured role', () => {
  const middleware = requireRole('DOCTOR');
  let nextError;

  middleware({ user: { role: 'DOCTOR' } }, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
});

test('role middleware rejects a different role', () => {
  const middleware = requireRole('ADMIN');
  let nextError;

  middleware({ user: { role: 'PATIENT' } }, {}, (error) => {
    nextError = error;
  });

  assert.ok(nextError instanceof HttpError);
  assert.equal(nextError.statusCode, 403);
});

test('role middleware returns 401 when authentication context is missing', () => {
  const middleware = requireRole('ADMIN');
  let nextError;

  middleware({}, {}, (error) => {
    nextError = error;
  });

  assert.ok(nextError instanceof HttpError);
  assert.equal(nextError.statusCode, 401);
});
