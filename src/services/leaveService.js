import api, { unwrapList } from './api';

const unwrap = (res) => unwrapList(res, ['requests']);

export const leaveService = {
  // Current user's own requests (ESS "my leave" view).
  list: () => api.get('/api/leave-requests/').then(unwrap),
  // Organization-wide list — admin-gated on the backend (403 for others).
  // Optionally scoped to one employee — the backend filters server-side.
  listAll: (employeeId) =>
    api
      .get('/api/leave-requests/all', employeeId ? { params: { employee_id: employeeId } } : undefined)
      .then(unwrap),
  get: (id) => api.get(`/api/leave-requests/${id}`),
  update: (id, data) => api.put(`/api/leave-requests/${id}`, data),
  // The backend 500s on a bodyless DELETE when Content-Type is json (our
  // client default), so always send an empty object.
  remove: (id) => api.delete(`/api/leave-requests/${id}`, { data: {} }),
  remind: (id) => api.post(`/api/leave-requests/${id}/remind`, {}),
};
