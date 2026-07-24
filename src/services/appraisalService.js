import api, { unwrapList } from './api';

// Appraisal module — wires the frontend to the existing backend across four
// sub-resources. The performance chain is:
//   performance_indicators (KPI catalog)
//     -> department_performance_indicators (per-cycle selection + weight)
//        -> appraisal_targets (employee target_value, draft -> submitted)
//           -> appraisal_reviews / items (reviewer achieved_value -> rating)
//
// api.js already unwraps `{status,data}` to the inner payload, so list methods
// receive an array directly; unwrapList stays defensive if the backend ever
// wraps a collection under a key. Every mutation sends a body (even `{}`) —
// a JSON content-type with an empty body 400/500s on this backend.

// ---------------------------------------------------------------------------
// Performance Indicators — org-wide KPI definitions (/api/performance-indicators)
// Auth: read = any authenticated; create/update/deactivate = admin or any dept head.
// ---------------------------------------------------------------------------
export const performanceIndicatorService = {
  list: (includeInactive = false) =>
    api
      .get('/api/performance-indicators/', includeInactive ? { params: { include_inactive: 'true' } } : undefined)
      .then((res) => unwrapList(res, ['indicators', 'performance_indicators'])),
  get: (id) => api.get(`/api/performance-indicators/${id}`),
  create: (data) => api.post('/api/performance-indicators/', data),
  update: (id, data) => api.put(`/api/performance-indicators/${id}`, data),
  // Soft delete — backend flips is_active to false.
  deactivate: (id) => api.delete(`/api/performance-indicators/${id}`, { data: {} }),
};

// ---------------------------------------------------------------------------
// Appraisal Cycles (/api/appraisal-cycles) + department indicator selections.
// Auth: open/lock = admin only; add/remove dept indicator = admin or that
// department's head; reads = any authenticated org member.
// ---------------------------------------------------------------------------
export const appraisalCycleService = {
  list: () => api.get('/api/appraisal-cycles/').then((res) => unwrapList(res, ['cycles'])),
  // The cycle for the org's current administration period, or null.
  current: () => api.get('/api/appraisal-cycles/current'),
  get: (id) => api.get(`/api/appraisal-cycles/${id}`),
  open: ({ administration_period_id, name }) =>
    api.post('/api/appraisal-cycles/', { administration_period_id, name: name || undefined }),
  // One-way, idempotent: freezes department indicator selection for the cycle.
  lockIndicators: (id) => api.post(`/api/appraisal-cycles/${id}/lock-indicators`, {}),

  // Department indicator selections (the per-cycle weighted KPI list).
  listDepartmentIndicators: (cycleId, departmentId, jobRoleId) =>
    api
      .get(`/api/appraisal-cycles/${cycleId}/departments/${departmentId}/indicators`, jobRoleId ? { params: { job_role_id: jobRoleId } } : undefined)
      .then((res) => unwrapList(res, ['indicators', 'selections'])),
  addDepartmentIndicator: (cycleId, departmentId, { performance_indicator_id, job_role_id, weight }) =>
    api.post(`/api/appraisal-cycles/${cycleId}/departments/${departmentId}/indicators`, {
      performance_indicator_id,
      job_role_id: job_role_id || null,
      weight: Number.isFinite(Number(weight)) ? Number(weight) : 0,
    }),
  removeDepartmentIndicator: (cycleId, departmentId, selectionId) =>
    api.delete(`/api/appraisal-cycles/${cycleId}/departments/${departmentId}/indicators/${selectionId}`, { data: {} }),
};

// ---------------------------------------------------------------------------
// Appraisal Targets (/api/appraisal-targets) — an employee's numeric goals.
// Auth: create/edit/submit = the owner (self); read own = self;
// read employee/:id = self, admin, that employee's manager, or dept head.
// Targets can only be created once the cycle's indicators are locked AND the
// administration period is active. Only 'draft' targets are editable.
// ---------------------------------------------------------------------------
export const appraisalTargetService = {
  listMine: (cycleId) =>
    api
      .get('/api/appraisal-targets/mine', cycleId ? { params: { appraisal_cycle_id: cycleId } } : undefined)
      .then((res) => unwrapList(res, ['targets'])),
  listForEmployee: (employeeId, cycleId) =>
    api
      .get(`/api/appraisal-targets/employee/${employeeId}`, cycleId ? { params: { appraisal_cycle_id: cycleId } } : undefined)
      .then((res) => unwrapList(res, ['targets'])),
  create: ({ appraisal_cycle_id, department_performance_indicator_id, target_value, target_description }) =>
    api.post('/api/appraisal-targets/', {
      appraisal_cycle_id,
      department_performance_indicator_id,
      target_value: Number(target_value),
      target_description: target_description || null,
    }),
  update: (id, data) => api.put(`/api/appraisal-targets/${id}`, data),
  submit: (id) => api.post(`/api/appraisal-targets/${id}/submit`, {}),
};

// ---------------------------------------------------------------------------
// Appraisal Reviews (/api/appraisal-reviews) — reviewer scores achievement.
// Auth: call-up = admin or target's manager/dept head (never self);
// rate/complete = admin or the review's reviewer; read = admin, reviewer,
// the reviewed employee, their manager, or dept head. Lifecycle is minimal:
// in_progress -> completed (no reopen/cancel/reject in this backend).
// ---------------------------------------------------------------------------
export const appraisalReviewService = {
  // No arg => reviews involving the caller (as employee OR reviewer).
  list: (filters = {}) => {
    const params = {};
    if (filters.employee_id) params.employee_id = filters.employee_id;
    if (filters.appraisal_cycle_id) params.appraisal_cycle_id = filters.appraisal_cycle_id;
    if (filters.status) params.status = filters.status;
    return api
      .get('/api/appraisal-reviews/', Object.keys(params).length ? { params } : undefined)
      .then((res) => unwrapList(res, ['reviews']));
  },
  get: (id) => api.get(`/api/appraisal-reviews/${id}`),
  callUp: ({ employee_id, appraisal_cycle_id }) =>
    api.post('/api/appraisal-reviews/call-up', { employee_id, appraisal_cycle_id }),
  // Record the achieved result for one indicator (review must be in_progress).
  submitItem: (reviewId, itemId, { achieved_value, comments }) =>
    api.put(`/api/appraisal-reviews/${reviewId}/items/${itemId}`, {
      achieved_value: Number(achieved_value),
      comments: comments || null,
    }),
  complete: (reviewId, reviewerComments) =>
    api.post(`/api/appraisal-reviews/${reviewId}/complete`, { reviewer_comments: reviewerComments || null }),
  // Publish a completed review to the employee (reviewer/admin).
  publish: (reviewId) => api.post(`/api/appraisal-reviews/${reviewId}/publish`, {}),
  // Employee acknowledges a published review.
  acknowledge: (reviewId) => api.post(`/api/appraisal-reviews/${reviewId}/acknowledge`, {}),
  // Employee raises an appeal on a published review.
  requestAppeal: (reviewId, reason) => api.post(`/api/appraisal-reviews/${reviewId}/appeals`, { reason }),
  listAppeals: (reviewId) =>
    api.get(`/api/appraisal-reviews/${reviewId}/appeals`).then((res) => unwrapList(res, ['appeals'])),
  resolveAppeal: (appealId, resolution) =>
    api.post(`/api/appraisal-reviews/appeals/${appealId}/resolve`, { resolution }),
  // Admin org/cycle report (completion %, averages, department breakdown).
  report: (cycleId) =>
    api.get('/api/appraisal-reviews/report', cycleId ? { params: { cycle_id: cycleId } } : undefined),
};

// Appraisal cycle lifecycle + reviewer-assignment config (admin).
export const appraisalCycleLifecycleService = {
  transition: (cycleId, status) => api.patch(`/api/appraisal-cycles/${cycleId}/status`, { status }),
  setReviewerAssignment: (cycleId, { reviewer_assignment_type, reviewer_employee_id }) =>
    api.put(`/api/appraisal-cycles/${cycleId}/reviewer-assignment`, {
      reviewer_assignment_type,
      reviewer_employee_id: reviewer_employee_id || null,
    }),
};
