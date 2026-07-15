import api, { unwrapList } from './api';

export const loanService = {
  listMine: () => api.get('/api/loan-request/').then((res) => unwrapList(res, ['loans', 'requests'])),
  create: (data) => api.post('/api/loan-request/', data),
  update: (id, data) => api.put(`/api/loan-request/${id}`, data),
  cancel: (id) => api.delete(`/api/loan-request/${id}`, { data: {} }),
  remind: (id) => api.post(`/api/loan-request/${id}/remind`),

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

  listLoanTypes: (status) =>
    api
      .get('/api/setups/loan-types', { params: status ? { status } : {} })
      .then((res) => unwrapList(res, ['loan_types', 'loanTypes'])),
  createLoanType: (data) => api.post('/api/setups/loan-types', data),
  updateLoanType: (id, data) => api.put(`/api/setups/loan-types/${id}`, data),
  deleteLoanType: (id) => api.delete(`/api/setups/loan-types/${id}`, { data: {} }),
};

export const computeLoanTerms = (amount, interestPerAnnum, tenureMonths) => {
  const principal = Number(amount);
  const n = Math.trunc(Number(tenureMonths));
  if (!(principal > 0) || !(n >= 1)) return { installment: 0, total: 0 };
  const r = Number(interestPerAnnum || 0) / 100 / 12;
  const raw = r > 0 ? (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1) : principal / n;
  const installment = Math.round(raw * 100) / 100;
  return { installment, total: Math.round(installment * n * 100) / 100 };
};


export const addMonthsISO = (isoDate, months) => {
  const base = String(isoDate || '').slice(0, 10);
  if (!base) return '';
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + Number(months || 0), d));
  return dt.toISOString().slice(0, 10);
};
