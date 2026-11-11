import {
  ApiError,
  apiClient,
  clearApiSession,
  readApiSession,
  storeApiSession,
} from './apiClient.js';

export const AUTH_ROLES = Object.freeze({
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
});

export const ROLE_HOME = Object.freeze({
  [AUTH_ROLES.PATIENT]: '/patient',
  [AUTH_ROLES.DOCTOR]: '/doctor',
  [AUTH_ROLES.ADMIN]: '/admin',
});

export const AUTH_API_CONTRACT = Object.freeze({
  login: '/api/auth/login',
  register: '/api/auth/register',
  logout: '/api/auth/logout',
  session: '/api/auth/me',
});

export class AuthServiceError extends Error {
  constructor(message, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

function validateCredentials({ email, password, role }) {
  if (!email?.trim() || !email.includes('@')) {
    throw new AuthServiceError('Please enter a valid email address.', 'INVALID_EMAIL');
  }

  if (!password || password.length < 8) {
    throw new AuthServiceError('Password must contain at least 8 characters.', 'INVALID_PASSWORD');
  }

  if (!Object.values(AUTH_ROLES).includes(role)) {
    throw new AuthServiceError('Please choose a valid account role.', 'INVALID_ROLE');
  }
}

function normalizeUser({ profile, role, user }) {
  return {
    id: profile?.user_id ?? user?.id ?? profile?.profile_id,
    profileId: profile?.profile_id,
    name: profile?.full_name ?? user?.full_name ?? '',
    email: user?.email ?? profile?.email ?? '',
    role: role ?? profile?.role ?? user?.role,
  };
}

function normalizeAuthError(error) {
  if (error instanceof AuthServiceError) return error;
  if (!(error instanceof ApiError)) return new AuthServiceError('Unable to authenticate right now.');

  let code = 'AUTH_ERROR';
  if (error.code === 'NETWORK_ERROR') code = 'NETWORK_ERROR';
  else if (error.status === 401) code = 'INVALID_CREDENTIALS';
  else if (error.status === 409) code = error.code === 'LICENSE_ALREADY_REGISTERED'
    ? 'LICENSE_ALREADY_REGISTERED' : 'ACCOUNT_EXISTS';
  else if (error.status === 502 || error.status === 503) code = 'AUTH_UNAVAILABLE';
  else if (error.status === 400) code = error.code === 'INVALID_LICENSE_NUMBER'
    ? 'INVALID_LICENSE_NUMBER' : 'REGISTRATION_REJECTED';
  return new AuthServiceError(error.message, code);
}

async function getSession() {
  if (!readApiSession()) return null;

  try {
    const payload = await apiClient.get(AUTH_API_CONTRACT.session);
    return { user: normalizeUser(payload), provider: 'backend' };
  } catch (error) {
    clearApiSession();
    if (error instanceof ApiError && error.status === 401) return null;
    throw normalizeAuthError(error);
  }
}

async function login(credentials) {
  try {
    validateCredentials(credentials);
    const payload = await apiClient.post(
      AUTH_API_CONTRACT.login,
      { email: credentials.email.trim(), password: credentials.password },
      { auth: false },
    );
    const user = normalizeUser({ profile: payload.user, role: payload.role, user: payload.user });

    if (user.role !== credentials.role) {
      throw new AuthServiceError('The selected role does not match this account.', 'INVALID_CREDENTIALS');
    }

    storeApiSession({
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresIn: payload.expires_in,
    }, credentials.remember);

    return { user, provider: 'backend' };
  } catch (error) {
    clearApiSession();
    throw normalizeAuthError(error);
  }
}

async function register(details) {
  validateCredentials(details);

  if (!details.name?.trim()) {
    throw new AuthServiceError('Please enter your full name.', 'INVALID_NAME');
  }

  if (details.password !== details.confirmPassword) {
    throw new AuthServiceError('Password confirmation does not match.', 'PASSWORD_MISMATCH');
  }

  if (details.role === AUTH_ROLES.DOCTOR && !details.specialization?.trim()) {
    throw new AuthServiceError('Please enter your specialization.', 'INVALID_SPECIALIZATION');
  }

  if (details.role === AUTH_ROLES.DOCTOR && !details.licenseNumber?.trim()) {
    throw new AuthServiceError('Please enter your license number.', 'INVALID_LICENSE_NUMBER');
  }
  if (details.role === AUTH_ROLES.DOCTOR && !/^[0-9]{5,12}$/.test(details.licenseNumber.trim())) {
    throw new AuthServiceError('Medical license number must contain 5 to 12 digits.', 'INVALID_LICENSE_NUMBER');
  }

  const registration = {
    email: details.email.trim(),
    full_name: details.name.trim(),
    password: details.password,
    role: details.role,
  };
  if (details.role === AUTH_ROLES.DOCTOR) {
    registration.specialization = details.specialization.trim();
    registration.license_number = details.licenseNumber.trim();
  }
  try {
    await apiClient.post(AUTH_API_CONTRACT.register, registration, { auth: false });
  } catch (error) {
    throw normalizeAuthError(error);
  }
  try {
    return await login({
      email: details.email,
      password: details.password,
      remember: details.remember ?? true,
      role: details.role,
    });
  } catch {
    throw new AuthServiceError('Registration could not be completed or sign-in is unavailable. Check your details and try again later.',
      'REGISTRATION_REJECTED');
  }
}

async function logout() {
  try {
    if (readApiSession()) await apiClient.post(AUTH_API_CONTRACT.logout);
  } catch {
    // Local cleanup must still complete when the token is already expired or
    // the authentication service is temporarily unavailable.
  } finally {
    clearApiSession();
  }
}

export const authService = Object.freeze({ getSession, login, logout, register });
