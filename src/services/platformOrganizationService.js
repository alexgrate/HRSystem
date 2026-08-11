import platformApi, { unwrapList } from './platformApi';

export const platformOrganizationService = {
  list: () => platformApi.get('/api/platform/organizations').then((res) => unwrapList(res, ['organizations'])),
  get: (id) => platformApi.get(`/api/platform/organizations/${id}`),
  create: (data) => platformApi.post('/api/platform/organizations', data),
  update: (id, data) => platformApi.put(`/api/platform/organizations/${id}`, data),
  activate: (id) => platformApi.post(`/api/platform/organizations/${id}/activate`, {}),
  deactivate: (id, reason) => platformApi.post(`/api/platform/organizations/${id}/deactivate`, { reason: reason || null }),
};
