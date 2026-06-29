import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        console.log("[AuthContext] Validating existing token...");
        const response = await api.get('/api/auth/me');
        const userData = response.authUser || response;
        console.log("[AuthContext] Current user validated successfully:", userData);
        setUser(userData);
      } catch (err) {
        console.error("[AuthContext] Token validation failed:", err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  const login = async (email, password) => {
    console.log(`[AuthContext] Initiating API login request for ${email}...`);
    const response = await api.post('/api/auth/login', { email, password });
    
    const { token, authUser } = response;
    
    console.log("[AuthContext] Login API Success. Received user:", authUser);
    
    localStorage.setItem('token', token);
    setUser(authUser);
    return authUser;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout'); 
    } catch (err) {
      console.warn("Logout endpoint failed:", err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);