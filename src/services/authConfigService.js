import api from './api';

// Org-admin control of HOW this organization's staff sign in — password, or
// their own OpenID Connect identity provider (OCI IAM, Azure AD, Okta,
// Keycloak, ...). Gated server-side by the SYSTEM_CONFIG permission.
export const authConfigService = {
  get: () => api.get('/api/auth-config'),
  update: (data) => api.put('/api/auth-config', data),
};
