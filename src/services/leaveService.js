import api from './api';

const unwrapList = (res) =>
  Array.isArray(res) ? res : res?.requests || res?.items || res?.data || [];

export const leaveService = {
  // Current user's own requests (ESS "my leave" view).
  list: () => api.get('/api/leave-requests/').then(unwrapList),
  // Organization-wide list — admin-gated on the backend (403 for others).
  listAll: () => api.get('/api/leave-requests/all').then(unwrapList),
  get: (id) => api.get(`/api/leave-requests/${id}`),
  update: (id, data) => api.put(`/api/leave-requests/${id}`, data),
  // The backend 500s on a bodyless DELETE when Content-Type is json (our
  // client default), so always send an empty object.
  remove: (id) => api.delete(`/api/leave-requests/${id}`, { data: {} }),
  remind: (id) => api.post(`/api/leave-requests/${id}/remind`, {}),
};
