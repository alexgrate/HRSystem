import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getToken, setToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await api.get('/api/auth/me');
    let roleResources;

    try {
      roleResources = await api.get('/api/role-permissions/me/resources');
    } catch {
      // Keep auth resilient while backend endpoints roll out in phases.
      roleResources = null;
    }

    // Some auth endpoints wrap the record ({ authUser } / { user }); permission
    // checks read is_admin/permissions off the top level, so unwrap here.
    const normalized = me?.authUser || me?.user || me;
    const permissionResources = roleResources?.resources || roleResources?.data?.resources || roleResources?.permissions || [];

    const merged = {
      ...normalized,
      permissions: permissionResources.length ? permissionResources : (normalized?.permissions || []),
      roleResources: permissionResources,
    };
    setUser(merged);
    return merged;
  }, []);

  useEffect(() => {
    // A previous build cached the whole profile in localStorage under 'user';
    // clear that PII on every start so it can't linger on shared machines.
    localStorage.removeItem('user');

    const validateToken = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch (err) {
        console.error('[AuthContext] Token validation failed:', err);
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [refreshUser]);

  const login = async (email, password, remember = true) => {
    const response = await api.post('/api/auth/login', { email, password });
    // Guard against a differently-wrapped response — storing an absent token
    // would persist the string "undefined" and silently break every request.
    const token = response?.token || response?.data?.token || response?.authUser?.token;
    if (typeof token !== 'string' || !token) {
      throw new Error('Login succeeded but no token was returned.');
    }

    setToken(token, remember);
    return refreshUser();
  };

  // Single-session takeover: `login` rejected with a 409 conflict carrying a
  // handoff token for the session that's already active elsewhere. Sign that
  // session out with it, then run the normal login again. A failed logout is
  // not fatal — if the other session ended in the meantime the backend answers
  // "User doesn't have an active session." and the retry just succeeds; any
  // other failure resurfaces as a fresh 409 on the retry for the caller.
  const forceLogin = async (email, password, remember = true, conflict) => {
    try {
      await api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${conflict?.token}` },
      });
    } catch (err) {
      console.warn('[AuthContext] Takeover logout failed:', err?.message || err);
    }
    return login(email, password, remember);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout endpoint failed:', err);
    } finally {
      clearToken();
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, forceLogin, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
