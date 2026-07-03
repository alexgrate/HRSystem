import api from './api';
export const rolePermissionService = {
  getSystemRoles: () => api.get('/api/role-permissions/system-roles'),
  getSystemResources: () => api.get('/api/role-permissions/system-resources'),
  getRoleResources: (roleId) =>
    api.get(`/api/role-permissions/system-roles/${roleId}/resources`),
  setRoleResources: (roleId, resources) =>
    api.post(`/api/role-permissions/system-roles/${roleId}/resources`, { resources }),

  getJobRoles: () => api.get('/api/job-roles/'),
  getJobRoleRoles: (jobRoleId) =>
    api.get(`/api/role-permissions/job-roles/${jobRoleId}/roles`),
  setJobRoleRoles: (jobRoleId, roleIds) =>
    api.post(`/api/role-permissions/job-roles/${jobRoleId}/roles`, { role_ids: roleIds }),
};

export const EMPTY_PERMS = {
  can_create: false,
  can_read: false,
  can_update: false,
  can_delete: false,
  can_manage: false,
};

export const PERMISSION_ACTIONS = [
  { key: 'can_read', short: 'R', label: 'Read', color: 'emerald' },
  { key: 'can_create', short: 'C', label: 'Create', color: 'sky' },
  { key: 'can_update', short: 'U', label: 'Update', color: 'violet' },
  { key: 'can_delete', short: 'D', label: 'Delete', color: 'red' },
  { key: 'can_manage', short: 'M', label: 'Manage / Approve', color: 'amber' },
];
