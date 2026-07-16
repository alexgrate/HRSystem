import api from './api';


export const isSessionConflict = (err) =>
  err?.httpStatus === 409 && typeof err?.token === 'string' && err.token.length > 0;

export const logoutAllSessionsWithToken = async (token) => {
  if (typeof token !== 'string' || !token) {
    throw new Error('No session token provided for logout-all request.');
  }

  return api.post('/api/auth/logout-all', { token }, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const authService = {
  requestPasswordReset: (email) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) =>
    api.post('/api/auth/reset-password', { email, otp, newPassword }),
  resendOtp: (email) =>
    api.post('/api/auth/resend-password-reset-otp', { email }),
};
