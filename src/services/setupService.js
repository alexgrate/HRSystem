import api from './api';

export const setupService = {
  getOffices: () => api.get('/api/office-locations/'),
  createOffice: (data) => api.post('/api/office-locations/', data),
  updateOffice: (id, data) => api.put(`/api/office-locations/${id}`, data),
  deleteOffice: (id) => api.delete(`/api/office-locations/${id}`),

  getDepartments: () => api.get('/api/departments/'),
  createDepartment: (data) => api.post('/api/departments/', data),
  updateDepartment: (id, data) => api.put(`/api/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/api/departments/${id}`),

  getBenefitLevels: () => api.get('/api/benefit-levels/'),
  createBenefitLevel: (data) => api.post('/api/benefit-levels/', data),
  updateBenefitLevel: (id, data) => api.put(`/api/benefit-levels/${id}`, data),
  deleteBenefitLevel: (id) => api.delete(`/api/benefit-levels/${id}`),

  getPayGrades: () => api.get('/api/pay-grades/'),
  createPayGrade: (data) => api.post('/api/pay-grades/', data),
  updatePayGrade: (id, data) => api.put(`/api/pay-grades/${id}`, data),
  deletePayGrade: (id) => api.delete(`/api/pay-grades/${id}`),

  getJobRoles: () => api.get('/api/job-roles/'),
  createJobRole: (data) => api.post('/api/job-roles/', data),

  getGrades: () => api.get('/api/grades/'),
  createGrade: (data) => api.post('/api/grades/', data),

  getWorkflows: () => api.get('/api/setups/approval-workflows'),
  createWorkflow: (data) => api.post('/api/setups/approval-workflows', data),

  bootstrapOrganization: (data) => api.post('/api/setups/bootstrap', data),
  getSetupOverview: () => api.get('/api/setups/overview'),
};