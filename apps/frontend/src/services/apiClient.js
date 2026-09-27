const DEFAULT_API_URL = 'http://localhost:3000';
const LOCAL_SESSION_KEY = 'dr250-api-session';
const BROWSER_SESSION_KEY = 'dr250-api-browser-session';

export const AUTH_EXPIRED_EVENT = 'dr250:auth-expired';

function normalizeBaseUrl(value) {
  return (value || DEFAULT_API_URL).replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_API_URL);

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.code = options.code ?? 'API_ERROR';
    this.details = options.details;
  }
}

function getStorageEntries() {
  if (typeof window === 'undefined') return [];
  return [
    [window.localStorage, LOCAL_SESSION_KEY],
    [window.sessionStorage, BROWSER_SESSION_KEY],
  ];
}

function parseStoredSession(storage, key) {
  const value = storage.getItem(key);
  if (!value) return null;

  try {
    const session = JSON.parse(value);
    if (!session?.accessToken) throw new Error('Invalid session');
    return session;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function clearApiSession() {
  for (const [storage, key] of getStorageEntries()) storage.removeItem(key);
}

export function readApiSession() {
  for (const [storage, key] of getStorageEntries()) {
    const session = parseStoredSession(storage, key);
    if (!session) continue;

    if (session.expiresAt && session.expiresAt <= Date.now()) {
      clearApiSession();
      return null;
    }

    return session;
  }

  return null;
}

export function storeApiSession(tokens, remember = false) {
  if (typeof window === 'undefined') return;

  clearApiSession();
  const session = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? null,
    expiresAt: tokens.expiresIn
      ? Date.now() + Math.max(0, Number(tokens.expiresIn) - 30) * 1000
      : null,
  };
  const storage = remember ? window.localStorage : window.sessionStorage;
  const key = remember ? LOCAL_SESSION_KEY : BROWSER_SESSION_KEY;
  storage.setItem(key, JSON.stringify(session));
}

const statusMessages = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to complete this request.',
  404: 'The requested information could not be found.',
  500: 'The server could not complete the request. Please try again.',
};

function emitAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function unwrapApiPayload(payload) {
  if (
    payload
    && typeof payload === 'object'
    && payload.success === true
    && Object.hasOwn(payload, 'data')
  ) {
    return payload.data;
  }

  return payload;
}

export async function apiRequest(path, options = {}) {
  const {
    auth = true,
    body,
    headers: customHeaders,
    method = 'GET',
    signal,
  } = options;
  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');

  const session = auth ? readApiSession() : null;
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      body: body === undefined || isFormData ? body : JSON.stringify(body),
      headers,
      method,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Unable to reach the Dr.250 service. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
    });
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearApiSession();
      emitAuthExpired();
    }

    const serverMessage = payload && typeof payload === 'object' ? payload.message : null;
    throw new ApiError(serverMessage || statusMessages[response.status] || 'The request failed.', {
      status: response.status,
      code: payload?.error ?? `HTTP_${response.status}`,
      details: payload?.details,
    });
  }

  return unwrapApiPayload(payload);
}

export const apiClient = Object.freeze({
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  patch: (path, body, options) => apiRequest(path, { ...options, body, method: 'PATCH' }),
  post: (path, body, options) => apiRequest(path, { ...options, body, method: 'POST' }),
});
