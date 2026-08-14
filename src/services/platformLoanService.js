import platformApi from './platformApi';

export const platformLoanService = {
  list: (params = {}) => platformApi.get('/api/platform/loans', { params }),
  get: (id) => platformApi.get(`/api/platform/loans/${id}`),
};
