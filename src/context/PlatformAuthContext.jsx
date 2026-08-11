import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import platformApi, { getPlatformToken, setPlatformToken, clearPlatformToken } from '../services/platformApi';

// Mirrors AuthContext.jsx's shape but is a wholly separate identity/session —
// the platform-admin portal (/platform/*) never shares state with the
// org-employee portal (/app/*).
const PlatformAuthContext = createContext(null);

export const PlatformAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAdmin = useCallback(async () => {
    const res = await platformApi.get('/api/platform/auth/me');
    const normalized = res?.admin || res;
    setAdmin(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      if (!getPlatformToken()) {
        setLoading(false);
        return;
      }
      try {
        await refreshAdmin();
      } catch (err) {
        console.error('[PlatformAuthContext] Token validation failed:', err);
        clearPlatformToken();
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [refreshAdmin]);

  const login = async (email, password, remember = true) => {
    const response = await platformApi.post('/api/platform/auth/login', { email, password });
    const token = response?.token;
    if (typeof token !== 'string' || !token) {
      throw new Error('Login succeeded but no token was returned.');
    }
    setPlatformToken(token, remember);
    return refreshAdmin();
  };

  const logout = async () => {
    try {
      await platformApi.post('/api/platform/auth/logout');
    } catch (err) {
      console.warn('[PlatformAuthContext] Logout endpoint failed:', err);
    } finally {
      clearPlatformToken();
      setAdmin(null);
    }
  };

  return (
    <PlatformAuthContext.Provider value={{ admin, loading, login, logout, refreshAdmin }}>
      {children}
    </PlatformAuthContext.Provider>
  );
};

export const usePlatformAuth = () => useContext(PlatformAuthContext);
