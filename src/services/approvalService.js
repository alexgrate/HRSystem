import api from './api';

const unwrapList = (res) =>
  Array.isArray(res) ? res : res?.requests || res?.items || res?.data || [];

export const approvalService = {

  // Approvals inbox needs the organization's requests, not the caller's own.
  // /all is admin-gated — fall back to the current-user list on 403 so a
  // non-admin approver still sees something rather than an error.
  getPendingLeave: () =>
    api.get('/api/leave-requests/all')
      .catch(() => api.get('/api/leave-requests/'))
      .then((res) =>
        unwrapList(res).filter((r) => String(r.status || 'pending').toLowerCase().startsWith('pend'))
      ),
  // The backend requires the pending approval_request_id in the body —
  // leave records carry it as `approval_request_id`.
  approveLeave: (id, approvalRequestId, comment) =>
    api.post(`/api/leave-requests/${id}/approve`, {
      approval_request_id: approvalRequestId,
      ...(comment ? { comment } : {}),
    }),
  rejectLeave: (id, approvalRequestId, comment) =>
    api.post(`/api/leave-requests/${id}/reject`, {
      approval_request_id: approvalRequestId,
      ...(comment ? { comment } : {}),
    }),

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
