import api, { unwrapList } from './api';

// Access Management — dynamic RBAC. Resources/actions are a fixed, backend-
// served catalog (nothing to hand-maintain on the frontend); roles, their
// grants, and user↔role assignments are fully configurable per organization.
export const accessControlService = {
  // Catalog + effective permissions (also consumed directly by PermissionContext).
  getCatalog: () => api.get('/api/access-control/catalog'),
  getMyPermissions: () => api.get('/api/access-control/me/permissions'),

  // Roles
  listRoles: () => api.get('/api/access-control/roles').then((res) => unwrapList(res, ['roles'])),
  getRole: (id) => api.get(`/api/access-control/roles/${id}`),
  createRole: ({ name, code, description }) =>
    api.post('/api/access-control/roles', { name, code, description: description || null }),
  updateRole: (id, data) => api.put(`/api/access-control/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/api/access-control/roles/${id}`, { data: {} }),
  duplicateRole: (id, name) => api.post(`/api/access-control/roles/${id}/duplicate`, { name }),

  // Role permissions (grants)
  getRolePermissions: (roleId) =>
    api.get(`/api/access-control/roles/${roleId}/permissions`).then((res) => unwrapList(res, ['grants'])),
  setRolePermissions: (roleId, grants) =>
    api.put(`/api/access-control/roles/${roleId}/permissions`, { grants }),

  // User ↔ role assignments
  listUsersWithRoles: () => api.get('/api/access-control/users').then((res) => unwrapList(res, ['users'])),
  getRolesForUser: (employeeId) =>
    api.get(`/api/access-control/users/${employeeId}/roles`).then((res) => unwrapList(res, ['roles'])),
  assignRoleToUser: (employeeId, roleId) =>
    api.post(`/api/access-control/users/${employeeId}/roles`, { role_id: roleId }),
  revokeRoleFromUser: (employeeId, roleId) =>
    api.delete(`/api/access-control/users/${employeeId}/roles/${roleId}`, { data: {} }),

  // Job title defaults (inheritance convenience layer)
  getJobTitleDefaultRoles: (jobRoleId) =>
    api.get(`/api/access-control/job-titles/${jobRoleId}/default-roles`).then((res) => unwrapList(res, ['roles'])),
  setJobTitleDefaultRoles: (jobRoleId, roleIds) =>
    api.put(`/api/access-control/job-titles/${jobRoleId}/default-roles`, { role_ids: roleIds }),

  // Reused by the Directory/job-title pickers.
  getJobRoles: () => api.get('/api/job-roles/'),
};
