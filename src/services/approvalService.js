import api, { unwrapList as unwrapListBy } from './api';

const unwrapList = (res) => unwrapListBy(res, ['requests', 'documents']);

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
  // The backend requires the pending approval_request_id in the body — leave
  // records carry it as `approval_request_id`. List rows occasionally lack it
  // (older rows, trimmed payloads), so resolve it from the record before
  // sending rather than posting null and failing server-side.
  resolveLeaveApprovalId: async (id, approvalRequestId) => {
    if (approvalRequestId) return approvalRequestId;
    const record = await api.get(`/api/leave-requests/${id}`);
    const resolved = record?.approval_request_id || record?.data?.approval_request_id || null;
    if (!resolved) throw new Error('This leave request has no pending approval attached.');
    return resolved;
  },
  approveLeave: async (id, approvalRequestId, comment) =>
    api.post(`/api/leave-requests/${id}/approve`, {
      approval_request_id: await approvalService.resolveLeaveApprovalId(id, approvalRequestId),
      ...(comment ? { comment } : {}),
    }),
  rejectLeave: async (id, approvalRequestId, comment) =>
    api.post(`/api/leave-requests/${id}/reject`, {
      approval_request_id: await approvalService.resolveLeaveApprovalId(id, approvalRequestId),
      ...(comment ? { comment } : {}),
    }),

  getPendingDocuments: () =>
    api.get('/api/documentations/?status=pending_approval').then(unwrapList),
  // The document approve/reject controllers forward `comment` to the underlying
  // approval action (setup engine), so a reviewer note is persisted end-to-end.
  approveDocument: (id, comment) =>
    api.post(`/api/documentations/${id}/approve`, comment ? { comment } : {}),
  rejectDocument: (id, comment) =>
    api.post(`/api/documentations/${id}/reject`, comment ? { comment } : {}),

  getPendingProfileUpdates: () =>
    api.get('/api/profile-update-requests/profile-update-request/organization?status=pending').then(unwrapList),
  approveProfileUpdate: (id, comment) =>
    api.post(`/api/profile-update-requests/profile-update-request/${id}/approve-all`, comment ? { comment } : {}),
  rejectProfileUpdate: (id, comment) =>
    api.post(`/api/profile-update-requests/profile-update-request/${id}/reject-all`, comment ? { comment } : {}),

  getMyProfileUpdates: () =>
    api
      .get('/api/profile-update-requests/profile-update-request/mine')
      .then((res) => unwrapList(res, ['requests'])),

  // The org's editable field catalog (grouped, with labels + can_write) so the
  // self-service form renders every requestable field rather than a hardcoded few.
  getProfileFields: () =>
    api
      .get('/api/profile-update-requests/profile-update-request/fields')
      .then((res) => unwrapListBy(res, [])),
};
