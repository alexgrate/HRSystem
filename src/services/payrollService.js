import api, { unwrapList } from './api';

export const payrollService = {
  preview: (data) => api.post('/api/payroll/preview', data),

  listRuns: () => api.get('/api/payroll/runs').then((res) => unwrapList(res, ['runs'])),
  getRun: (runId) => api.get(`/api/payroll/runs/${runId}`),

  // Employee self-service payslips: server-scoped to the caller's own lines
  // (only distributed runs). Use this from ESS instead of reading whole runs —
  // /runs and /runs/:id return every colleague's pay to any authenticated user.
  listMyPayslips: () => api.get('/api/payroll/payslips/me').then((res) => unwrapList(res, ['payslips'])),

  submitRun: (runId) => api.post(`/api/payroll/runs/${runId}/submit`, {}),
  approveRun: (runId, approvalRequestId, comment) =>
    api.post(`/api/payroll/runs/${runId}/approve`, { approval_request_id: approvalRequestId, comment: comment || null }),
  rejectRun: (runId, approvalRequestId, comment) =>
    api.post(`/api/payroll/runs/${runId}/reject`, { approval_request_id: approvalRequestId, comment: comment || null }),
  rejectLockIn: (runId, approvalRequestId, comment) =>
    api.post(`/api/payroll/runs/${runId}/reject-lock-in`, { approval_request_id: approvalRequestId, comment: comment || null }),
  rejectDistribution: (runId, approvalRequestId, comment) =>
    api.post(`/api/payroll/runs/${runId}/reject-distribution`, { approval_request_id: approvalRequestId, comment: comment || null }),
  requestLockIn: (runId) => api.post(`/api/payroll/runs/${runId}/request-lock-in`, {}),
  approveLockIn: (runId, approvalRequestId, comment) =>
    api.post(`/api/payroll/runs/${runId}/approve-lock-in`, { approval_request_id: approvalRequestId, comment: comment || null }),
  requestDistribution: (runId) => api.post(`/api/payroll/runs/${runId}/request-distribution`, {}),
  approveDistribution: (runId, approvalRequestId, comment) =>
    api.post(`/api/payroll/runs/${runId}/approve-distribution`, { approval_request_id: approvalRequestId, comment: comment || null }),

  listAdjustments: () => api.get('/api/payroll/adjustments').then((res) => unwrapList(res, ['adjustments'])),
  createAdjustment: (data) => api.post('/api/payroll/adjustments', data),
  submitAdjustment: (adjustmentId) => api.post(`/api/payroll/adjustments/${adjustmentId}/submit`, {}),
  approveAdjustment: (adjustmentId, approvalRequestId, comment) =>
    api.post(`/api/payroll/adjustments/${adjustmentId}/approve`, { approval_request_id: approvalRequestId, comment: comment || null }),
  rejectAdjustment: (adjustmentId, approvalRequestId, comment) =>
    api.post(`/api/payroll/adjustments/${adjustmentId}/reject`, { approval_request_id: approvalRequestId, comment: comment || null }),
};

export const findApprovalRequestId = (obj) => {
  if (!obj) return null;
  const direct =
    obj.approval_request_id ||
    obj.pending_approval_request_id ||
    obj.approval_request?.id;
  if (direct) return direct;
  const nests = [obj.run, obj.adjustment, obj.data].filter(Boolean);
  for (const n of nests) {
    const found = findApprovalRequestId(n);
    if (found) return found;
  }
  const lists = [obj.approval_requests, obj.approvalRequests].filter(Array.isArray);
  for (const arr of lists) {
    const pending = arr.find((a) => String(a.status || '').toLowerCase().includes('pend')) || arr[arr.length - 1];
    if (pending?.id) return pending.id;
  }
  return null;
};
