import api from './api';


export const isSessionConflict = (err) =>
  err?.httpStatus === 409 && typeof err?.token === 'string' && err.token.length > 0;

export const authService = {
  requestPasswordReset: (email) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) =>
    api.post('/api/auth/reset-password', { email, otp, newPassword }),
  resendOtp: (email) =>
    api.post('/api/auth/resend-password-reset-otp', { email }),
  // Resolved from the requesting subdomain (or VITE_ORG_SLUG locally) — tells
  // the login page whether this org signs in with a password or via its own
  // SSO provider, and if SSO, the URL to redirect the browser to.
  getLoginMethod: () => api.get('/api/auth/login-method'),
  // Self-service: creates a new organization + its first admin, unauthenticated.
  // The org and account stay inactive until the admin clicks the emailed
  // verification link — this call never returns a usable session.
  signup: (data) => api.post('/api/public/signup', data),
};
