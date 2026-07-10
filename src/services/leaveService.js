import api from './api';

const unwrapList = (res) =>
  Array.isArray(res) ? res : res?.requests || res?.items || res?.data || [];

// NOTE(backend): GET /api/leave-requests/ is documented "for current user" —
// admins/approvers need it to return their organization's requests for the
// Leave Administration page to show more than their own leave.
export const leaveService = {
  list: () => api.get('/api/leave-requests/').then(unwrapList),
  update: (id, data) => api.put(`/api/leave-requests/${id}`, data),
  remove: (id) => api.delete(`/api/leave-requests/${id}`),
  remind: (id) => api.post(`/api/leave-requests/${id}/remind`, {}),
};
