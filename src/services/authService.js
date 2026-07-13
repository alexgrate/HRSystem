import api from './api';

export const authService = {
  requestPasswordReset: (email) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) =>
    api.post('/api/auth/reset-password', { email, otp, newPassword }),
  resendOtp: (email) =>
    api.post('/api/auth/resend-password-reset-otp', { email }),
};
