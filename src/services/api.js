import axios from 'axios';

// VITE_API_URL must be set for any non-dev build; the localhost default only
// covers local development. Warn loudly if a production bundle ships without it.
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

// axios attaches the request config — including the `Authorization: Bearer …`
// header — to every error it rejects. Callers log these errors, so redact the
// token first: an XSS that reads console output must not recover the session.
const scrubError = (error) => {
    if (error?.config?.headers?.Authorization) error.config.headers.Authorization = '[REDACTED]';
    if (error?.response?.config?.headers?.Authorization) error.response.config.headers.Authorization = '[REDACTED]';
    return error;
};

// "Remember me" decides where the token lives: localStorage persists across
// browser restarts, sessionStorage ends with the tab session.
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
        const token = getToken();
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(scrubError(error))
);

// Response contract: the backend wraps success payloads as
// { status: 'success', data }, so the happy path returns `response.data.data`
// directly (callers receive the inner payload, not the envelope). Errors
// reject with the backend's error object. Non-enveloped responses fall through
// as raw `response.data` — services still normalize defensively because a few
// endpoints don't use the envelope.
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
                // Only treat a 401 as session-expiry when we actually held a
                // session and it wasn't an auth endpoint. A wrong password or
                // OTP (/api/auth/*) is handled inline by the page — clearing
                // the token and hard-redirecting would yank the user out of
                // the login/reset flow mid-attempt.
                const url = error.config?.url || '';
                const isAuthEndpoint = url.includes('/api/auth/');
                if (!isAuthEndpoint && getToken()) {
                    clearToken();
                    if (window.location.pathname !== '/login') {
                        window.location.assign('/login');
                    }
                }
            }
            return Promise.reject(error.response.data?.error || error.response.data || error)
        }
        return Promise.reject(error)
    }
)

// List responses vary in shape across endpoints ([…], {items}, {data}, or a
// resource-named key). One unwrapper for every service; pass the keys the
// endpoint is known to use, most-specific first.
export const unwrapList = (res, keys = []) => {
    if (Array.isArray(res)) return res;
    for (const k of [...keys, 'items', 'data']) {
        if (Array.isArray(res?.[k])) return res[k];
    }
    return [];
};

export default api;