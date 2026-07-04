import api from './api';

const unwrapList = (res) =>
  Array.isArray(res) ? res : res?.requests || res?.items || res?.data || [];

export const approvalService = {

  getPendingLeave: () =>
    api.get('/api/leave-requests/').then((res) =>
      unwrapList(res).filter((r) => String(r.status || 'pending').toLowerCase().startsWith('pend'))
    ),
  approveLeave: (id, comment) => api.post(`/api/leave-requests/${id}/approve`, comment ? { comment } : {}),
  rejectLeave: (id, comment) => api.post(`/api/leave-requests/${id}/reject`, comment ? { comment } : {}),

  getPendingDocuments: () =>
    api.get('/api/documentations/?status=pending_approval').then(unwrapList),
  approveDocument: (id) => api.post(`/api/documentations/${id}/approve`, {}),
  rejectDocument: (id) => api.post(`/api/documentations/${id}/reject`, {}),

  getPendingProfileUpdates: () =>
    api.get('/api/profile-update-requests/profile-update-request/organization?status=pending').then(unwrapList),
  approveProfileUpdate: (id, comment) =>
    api.post(`/api/profile-update-requests/profile-update-request/${id}/approve-all`, comment ? { comment } : {}),
  rejectProfileUpdate: (id, comment) =>
    api.post(`/api/profile-update-requests/profile-update-request/${id}/reject-all`, comment ? { comment } : {}),

  getMyProfileUpdates: (employeeId) =>
    api
      .get(`/api/profile-update-requests/profile-update-request/organization?employee_id=${encodeURIComponent(employeeId)}`)
      .then(unwrapList),
};
