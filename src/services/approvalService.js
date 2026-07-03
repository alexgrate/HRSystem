import api from './api';

export const approvalService = {
  getPendingLeave: () => api.get('/api/leave-requests/pending'),
  approveLeave: (id, comment) => api.post(`/api/leave-requests/${id}/approve`, comment ? { comment } : {}),
  rejectLeave: (id, comment) => api.post(`/api/leave-requests/${id}/reject`, comment ? { comment } : {}),

  getPendingDocuments: () => api.get('/api/documentations/pending'),
  approveDocument: (id) => api.post(`/api/documentations/${id}/approve`, {}),
  rejectDocument: (id) => api.post(`/api/documentations/${id}/reject`, {}),

  // Path pattern mirrors leave/documents; the submit side already uses
  // /api/profile-update-requests/* — confirm exact routes with the backend.
  getPendingProfileUpdates: () => api.get('/api/profile-update-requests/pending'),
  approveProfileUpdate: (id, comment) => api.post(`/api/profile-update-requests/${id}/approve`, comment ? { comment } : {}),
  rejectProfileUpdate: (id, comment) => api.post(`/api/profile-update-requests/${id}/reject`, comment ? { comment } : {}),

  // Own submissions, for ESS request tracking.
  getMyProfileUpdates: () => api.get('/api/profile-update-requests/'),
};
