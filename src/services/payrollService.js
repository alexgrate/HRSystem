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

  // Recurring per-pay-grade pay components (remuneration/deduction, fixed/percentage
  // of base salary), applied automatically to every staff member on that
  // grade every time a run is previewed.
  listLineItems: (payGradeId) =>
    api
      .get('/api/payroll-line-items', { params: payGradeId ? { pay_grade_id: payGradeId } : {} })
      .then((res) => unwrapList(res, ['line_items'])),
  createLineItem: (data) => api.post('/api/payroll-line-items', data),
  updateLineItem: (id, data) => api.put(`/api/payroll-line-items/${id}`, data),
  deleteLineItem: (id) => api.delete(`/api/payroll-line-items/${id}`, { data: {} }),
  // Bulk create multiple line items for a pay grade. Expects an array of
  // item objects matching the create payload shape. The backend should
  // validate and return created items or an error.
  bulkCreateLineItems: (payGradeId, items) =>
    api.post('/api/payroll-line-items/bulk', { pay_grade_id: payGradeId, items }),

  // Custom columns — one-off, scoped to a single payroll run. "Global"
  // (is_global: true) starts blank for every employee on the run until the
  // officer sets individual values; "peculiar" (is_global: false) is created
  // directly against one employee with its amount.
  listCustomColumns: (runId) =>
    api.get('/api/payroll/custom-columns', { params: { run_id: runId } }).then((res) => unwrapList(res, ['columns'])),
  createCustomColumn: (data) => api.post('/api/payroll/custom-columns', data),
  setCustomColumnValue: (columnId, { employee_id, amount }) =>
    api.put(`/api/payroll/custom-columns/${columnId}/values`, { employee_id, amount }),
  deleteCustomColumnValue: (columnId, employeeId) =>
    api.delete(`/api/payroll/custom-columns/${columnId}/values/${employeeId}`, { data: {} }),
  deleteCustomColumn: (columnId) => api.delete(`/api/payroll/custom-columns/${columnId}`, { data: {} }),
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
