import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await api.get('/api/auth/me');
    // Some auth endpoints wrap the record ({ authUser } / { user }); permission
    // checks read is_admin/permissions off the top level, so unwrap here.
    const normalized = me?.authUser || me?.user || me;
    setUser(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    // A previous build cached the whole profile in localStorage under 'user';
    // clear that PII on every start so it can't linger on shared machines.
    localStorage.removeItem('user');

    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch (err) {
        console.error('[AuthContext] Token validation failed:', err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [refreshUser]);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { token } = response;

    localStorage.setItem('token', token);
    return refreshUser();
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout endpoint failed:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
