import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.error('[api] VITE_API_URL is not set — falling back to localhost:5000. Set it in the production environment.');
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

const scrubError = (error) => {
    if (error?.config?.headers?.Authorization) error.config.headers.Authorization = '[REDACTED]';
    if (error?.response?.config?.headers?.Authorization) error.response.config.headers.Authorization = '[REDACTED]';
    return error;
};

export const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
export const setToken = (token, remember) => {
    clearToken();
    (remember ? localStorage : sessionStorage).setItem('token', token);
};
export const clearToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
};

const SESSION_EXPIRED_MSG = 'Session expired or revoked. Please login again.';

const parseJwtPayload = (token) => {
    try {
        const part = token?.split('.')?.[1];
        if (!part) return null;
        const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        return JSON.parse(window.atob(padded));
    } catch {
        return null;
    }
};

const isTokenExpired = (token) => {
    const payload = parseJwtPayload(token);
    if (!payload?.exp) return false;
    return Date.now() >= Number(payload.exp) * 1000;
};

const forceLogoutToLogin = () => {
    clearToken();
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
};

const isSessionExpired401 = (error) => {
    if (error?.response?.status !== 401) return false;
    const responseMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
    return responseMessage === SESSION_EXPIRED_MSG;
};

api.interceptors.request.use(
    (config) => {

        if (!config.headers.Authorization) {
            const token = getToken();
            if(token) {
                if (isTokenExpired(token)) {
                    forceLogoutToLogin();
                    return Promise.reject({ message: SESSION_EXPIRED_MSG, httpStatus: 401 });
                }
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(scrubError(error))
);

api.interceptors.response.use(
    (response) => {

        if (response.data && response.data.status === 'success') {
            return response.data.data;
        }
        if (response.data && response.data.status === 'error') {
        return Promise.reject(response.data.error || { message: 'API validation failed' });
        }

        return response.data;
    },
    (error) => {
        scrubError(error);
        if (isSessionExpired401(error)) {
            forceLogoutToLogin();
        }
        if(error.response) {
            if (error.response.status === 401) {

                const url = error.config?.url || '';
                const isAuthEndpoint = url.includes('/api/auth/');
                if (getToken() && (!isAuthEndpoint || isSessionExpired401(error))) {
                    forceLogoutToLogin();
                }
            }

            const payload = error.response.data?.error || error.response.data || error;
            if (payload && typeof payload === 'object') {
                try { payload.httpStatus = error.response.status; } catch { /* non-extensible payload */ }
            }
            return Promise.reject(payload)
        }
        return Promise.reject(error)
    }
)

export const unwrapList = (res, keys = []) => {
    if (Array.isArray(res)) return res;
    for (const k of [...keys, 'items', 'data']) {
        if (Array.isArray(res?.[k])) return res[k];
    }
    return [];
};

export default api;