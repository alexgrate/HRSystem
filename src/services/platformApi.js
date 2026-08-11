import axios from 'axios';

// A second, fully independent axios instance for the platform-admin portal.
// Deliberately mirrors services/api.js's shape but reads/writes a DISTINCT
// token storage key so an org-employee session and a platform-admin session
// can coexist in the same browser without clobbering each other. Never sends
// x-organization-slug — /api/platform/* routes bypass tenant resolution
// entirely (isPlatformAuth never resolves an organization).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const platformApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const scrubError = (error) => {
    if (error?.config?.headers?.Authorization) error.config.headers.Authorization = '[REDACTED]';
    if (error?.response?.config?.headers?.Authorization) error.response.config.headers.Authorization = '[REDACTED]';
    return error;
};

export const getPlatformToken = () => localStorage.getItem('platform_token') || sessionStorage.getItem('platform_token');
export const setPlatformToken = (token, remember) => {
    clearPlatformToken();
    (remember ? localStorage : sessionStorage).setItem('platform_token', token);
};
export const clearPlatformToken = () => {
    localStorage.removeItem('platform_token');
    sessionStorage.removeItem('platform_token');
};

platformApi.interceptors.request.use(
    (config) => {
        if (!config.headers.Authorization) {
            const token = getPlatformToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(scrubError(error)),
);

platformApi.interceptors.response.use(
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
        if (error.response) {
            if (error.response.status === 401) {
                const url = error.config?.url || '';
                const isAuthEndpoint = url.includes('/auth/login');
                if (!isAuthEndpoint && getPlatformToken()) {
                    clearPlatformToken();
                    if (window.location.pathname !== '/platform/login') {
                        window.location.assign('/platform/login');
                    }
                }
            }
            const payload = error.response.data?.error || error.response.data || error;
            if (payload && typeof payload === 'object') {
                try { payload.httpStatus = error.response.status; } catch { /* non-extensible payload */ }
            }
            return Promise.reject(payload);
        }
        return Promise.reject(error);
    },
);

export const unwrapList = (res, keys = []) => {
    if (Array.isArray(res)) return res;
    for (const k of [...keys, 'items', 'data']) {
        if (Array.isArray(res?.[k])) return res[k];
    }
    return [];
};

export default platformApi;
