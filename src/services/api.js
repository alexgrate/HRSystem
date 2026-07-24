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
};

api.interceptors.request.use(
    (config) => {

        if (!config.headers.Authorization) {
            const token = getToken();
            if(token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        // Deployed backends resolve the org from the hostname; a localhost
        // backend can't, so VITE_ORG_SLUG pins the real org in local dev.
        const orgSlug = import.meta.env.VITE_ORG_SLUG;
        if (orgSlug && !config.headers['x-organization-slug']) {
            config.headers['x-organization-slug'] = orgSlug;
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
        if(error.response) {
            if (error.response.status === 401) {

                const url = error.config?.url || '';
                const isAuthEndpoint = url.includes('/api/auth/');
                if (!isAuthEndpoint && getToken()) {
                    clearToken();
                    if (window.location.pathname !== '/login') {
                        window.location.assign('/login');
                    }
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