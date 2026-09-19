import { useCallback, useEffect, useMemo, useState } from 'react';

import { authService } from '../services/authService.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    authService
      .getSession()
      .then((session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setStatus(session?.user ? 'authenticated' : 'unauthenticated');
      })
      .catch((sessionError) => {
        if (!active) return;
        setError(sessionError);
        setStatus('unauthenticated');
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    setStatus('loading');
    setError(null);

    try {
      const session = await authService.login(credentials);
      setUser(session.user);
      setStatus('authenticated');
      return session.user;
    } catch (loginError) {
      setUser(null);
      setError(loginError);
      setStatus('unauthenticated');
      throw loginError;
    }
  }, []);

  const register = useCallback(async (details) => {
    setStatus('loading');
    setError(null);

    try {
      const session = await authService.register(details);
      setUser(session.user);
      setStatus('authenticated');
      return session.user;
    } catch (registrationError) {
      setUser(null);
      setError(registrationError);
      setStatus('unauthenticated');
      throw registrationError;
    }
  }, []);

  const logout = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      clearError,
      error,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      logout,
      register,
      status,
      user,
    }),
    [clearError, error, login, logout, register, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
