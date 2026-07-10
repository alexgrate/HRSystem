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
  updateJobRole: (id, data) => api.put(`/api/job-roles/${id}`, data),
  deleteJobRole: (id) => api.delete(`/api/job-roles/${id}`),

  getGrades: () => api.get('/api/grades/'),
  createGrade: (data) => api.post('/api/grades/', data),
  updateGrade: (id, data) => api.put(`/api/grades/${id}`, data),
  deleteGrade: (id) => api.delete(`/api/grades/${id}`),

  getPayGroups: () => api.get('/api/pay-groups/'),
  createPayGroup: (data) => api.post('/api/pay-groups/', data),
  updatePayGroup: (id, data) => api.put(`/api/pay-groups/${id}`, data),
  deletePayGroup: (id) => api.delete(`/api/pay-groups/${id}`),

  getBenefitLevelAllowances: () => api.get('/api/setups/benefit-level-allowances'),
  createBenefitLevelAllowance: (data) => api.post('/api/setups/benefit-level-allowances', data),
  updateBenefitLevelAllowance: (id, data) => api.put(`/api/setups/benefit-level-allowances/${id}`, data),
  deleteBenefitLevelAllowance: (id) => api.delete(`/api/setups/benefit-level-allowances/${id}`),

  getWorkflows: () => api.get('/api/setups/approval-workflows'),
  createWorkflow: (data) => api.post('/api/setups/approval-workflows', data),
  updateWorkflow: (id, data) => api.put(`/api/setups/approval-workflows/${id}`, data),
  deleteWorkflow: (id) => api.delete(`/api/setups/approval-workflows/${id}`),

  getLeaveTypes: () => api.get('/api/setups/leave-types'),
  createLeaveType: (data) => api.post('/api/setups/leave-types', data),
  updateLeaveType: (id, data) => api.put(`/api/setups/leave-types/${id}`, data),
  deleteLeaveType: (id) => api.delete(`/api/setups/leave-types/${id}`),

  bootstrapOrganization: (data) => api.post('/api/setups/bootstrap', data),
  getSetupOverview: () => api.get('/api/setups/overview'),
};