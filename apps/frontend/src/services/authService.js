const LOCAL_SESSION_KEY = 'dr250-auth-session';
const BROWSER_SESSION_KEY = 'dr250-auth-browser-session';
const MOCK_DELAY = 450;

export const AUTH_ROLES = Object.freeze({
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  LAB: 'LAB',
  ADMIN: 'ADMIN',
});

export const ROLE_HOME = Object.freeze({
  [AUTH_ROLES.PATIENT]: '/patient',
  [AUTH_ROLES.DOCTOR]: '/doctor',
  [AUTH_ROLES.LAB]: '/lab',
  [AUTH_ROLES.ADMIN]: '/admin',
});

export const AUTH_API_CONTRACT = Object.freeze({
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
  session: '/auth/session',
});

export class AuthServiceError extends Error {
  constructor(message, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

function wait(duration = MOCK_DELAY) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function parseSession(storage, key) {
  const storedValue = storage.getItem(key);

  if (!storedValue) return null;

  try {
    return JSON.parse(storedValue);
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function readSession() {
  return (
    parseSession(window.localStorage, LOCAL_SESSION_KEY) ??
    parseSession(window.sessionStorage, BROWSER_SESSION_KEY)
  );
}

function clearStoredSession() {
  window.localStorage.removeItem(LOCAL_SESSION_KEY);
  window.sessionStorage.removeItem(BROWSER_SESSION_KEY);
}

function validateCredentials({ email, password, role }) {
  if (!email?.trim() || !email.includes('@')) {
    throw new AuthServiceError('Please enter a valid email address.', 'INVALID_EMAIL');
  }

  if (!password || password.length < 6) {
    throw new AuthServiceError('Password must contain at least 6 characters.', 'INVALID_PASSWORD');
  }

  if (!Object.values(AUTH_ROLES).includes(role)) {
    throw new AuthServiceError('Please choose a valid account role.', 'INVALID_ROLE');
  }

  if (email.toLowerCase().includes('error') || password === 'wrongpass') {
    throw new AuthServiceError('The email, password, or role does not match.', 'INVALID_CREDENTIALS');
  }
}

function nameFromEmail(email) {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createSession({ email, name, role }) {
  return {
    user: {
      id: `MOCK-${role}-${Date.now()}`,
      name: name?.trim() || nameFromEmail(email),
      email: email.trim().toLowerCase(),
      role,
    },
    createdAt: new Date().toISOString(),
    provider: 'mock',
  };
}

function storeSession(session, remember) {
  clearStoredSession();
  const storage = remember ? window.localStorage : window.sessionStorage;
  const key = remember ? LOCAL_SESSION_KEY : BROWSER_SESSION_KEY;
  storage.setItem(key, JSON.stringify(session));
}

async function getSession() {
  await wait(280);
  return readSession();
}

async function login(credentials) {
  await wait();
  validateCredentials(credentials);
  const session = createSession(credentials);
  storeSession(session, credentials.remember);
  return session;
}

async function register(details) {
  await wait(600);
  validateCredentials(details);

  if (!details.name?.trim()) {
    throw new AuthServiceError('Please enter your full name.', 'INVALID_NAME');
  }

  if (details.password !== details.confirmPassword) {
    throw new AuthServiceError('Password confirmation does not match.', 'PASSWORD_MISMATCH');
  }

  const session = createSession(details);
  storeSession(session, details.remember ?? true);
  return session;
}

async function logout() {
  await wait(220);
  clearStoredSession();
}

export const authService = Object.freeze({
  getSession,
  login,
  logout,
  register,
});
