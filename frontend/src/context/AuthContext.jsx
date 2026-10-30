import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api('/auth/session');
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Any 401 from a protected endpoint means the server-side session is gone.
    const onUnauthorized = () => setUser(null);
    window.addEventListener('ea:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ea:unauthorized', onUnauthorized);
  }, [refresh]);

  /** Returns `{ user }` for patients or `{ challenge }` when a second factor is required. */
  const login = useCallback(async (email, password, portal) => {
    const res = await api('/auth/login', { method: 'POST', body: { email, password, portal } });
    if (!res.mfaRequired) setUser(res.user);
    return res;
  }, []);

  const verifyOtp = useCallback(async (challengeId, code) => {
    const { user } = await api('/auth/verify-otp', { method: 'POST', body: { challengeId, code } });
    setUser(user);
    return user;
  }, []);

  const registerPatient = useCallback(async (payload) => {
    const { user } = await api('/auth/register', { method: 'POST', body: payload });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, verifyOtp, registerPatient, logout, setUser }),
    [user, loading, refresh, login, verifyOtp, registerPatient, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
