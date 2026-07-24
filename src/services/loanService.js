import api, { unwrapList } from './api';

export const loanService = {
  // Loan limits live on the employee's pay grade (single source of truth).
  // Returns the positive cap, or null when no grade/cap is configured —
  // the backend enforces the real limit either way.
  getMyPayGradeLoanCap: async () => {
    const profile = await api.get('/api/users/profile');
    if (!profile?.pay_grade) return null;
    const grade = await api.get(`/api/pay-grades/${profile.pay_grade}`);
    const cap = Number(grade?.max_loan_applicable);
    return Number.isFinite(cap) && cap > 0 ? cap : null;
  },

  listMine: () => api.get('/api/loan-request/').then((res) => unwrapList(res, ['loans', 'requests'])),
  // Server-computed preview: exact installment, total, total_interest, end_date,
  // amortization and the 33.3% affordability decision. Replaces all client math.
  quote: (payload) => api.post('/api/loan-request/quote', payload),
  create: (data) => api.post('/api/loan-request/', data),
  update: (id, data) => api.put(`/api/loan-request/${id}`, data),
  cancel: (id) => api.delete(`/api/loan-request/${id}`, { data: {} }),
  // Pass an explicit {} body: the axios instance sets Content-Type: application/json
  // on every request, and the backend rejects that header with an empty body (400).
  remind: (id) => api.post(`/api/loan-request/${id}/remind`, {}),

  get: (id) => api.get(`/api/loan-request/${id}`),
  getSchedule: (id) => api.get(`/api/loan-request/${id}/repayment-schedule`),
  listRepayments: (id) =>
    api.get(`/api/loan-request/${id}/repayments`).then((res) => unwrapList(res, ['repayments'])),


  approve: (id, approvalRequestId, comment) =>
    api.post(`/api/loan-request/${id}/approve`, {
      approval_request_id: approvalRequestId,
      comment: comment || null,
    }),
  reject: (id, approvalRequestId, comment) =>
    api.post(`/api/loan-request/${id}/reject`, {
      approval_request_id: approvalRequestId,
      comment: comment || null,
    }),

  listAll: () => api.get('/api/loan-request/all').then((res) => unwrapList(res, ['loans', 'requests'])),

  getRepaymentConfig: () =>
    api.get('/api/loan-request/repayment-config').then((res) => unwrapList(res, ['methods', 'config'])),
  setRepaymentConfig: (methods) =>
    api.put('/api/loan-request/repayment-config', { methods }).then((res) => unwrapList(res, ['methods', 'config'])),
  setRepaymentMethod: (id, method) =>
    api.put(`/api/loan-request/${id}/repayment-method`, { repayment_method: method }),

  recordRepayment: (id, { amount, payment_date, note }) =>
    api.post(`/api/loan-request/${id}/repayments`, { amount, payment_date, note: note || undefined }),

  // Phase 6 — record a disbursement (money released) on an approved loan.
  disburse: (id, payload = {}) => api.post(`/api/loan-request/${id}/disburse`, payload),

  // Phase 2 — organization loan policy.
  getPolicy: () => api.get('/api/loan-request/policy'),
  setPolicy: (payload) => api.put('/api/loan-request/policy', payload),

  // Dashboard/report aggregate.
  getSummary: () => api.get('/api/loan-request/summary'),

  listLoanTypes: (status) =>
    api
      .get('/api/setups/loan-types', { params: status ? { status } : {} })
      .then((res) => unwrapList(res, ['loan_types', 'loanTypes'])),
  createLoanType: (data) => api.post('/api/setups/loan-types', data),
  updateLoanType: (id, data) => api.put(`/api/setups/loan-types/${id}`, data),
  deleteLoanType: (id) => api.delete(`/api/setups/loan-types/${id}`, { data: {} }),

  // Org-defined loan product types (metadata for grouping/reporting).
  listProductTypes: (includeArchived) =>
    api
      .get('/api/setups/loan-product-types', { params: includeArchived ? { include_archived: 'true' } : {} })
      .then((res) => unwrapList(res, ['product_types', 'productTypes', 'types'])),
  createProductType: (data) => api.post('/api/setups/loan-product-types', data),
  updateProductType: (id, data) => api.put(`/api/setups/loan-product-types/${id}`, data),
  deleteProductType: (id) => api.delete(`/api/setups/loan-product-types/${id}`, { data: {} }),
};
