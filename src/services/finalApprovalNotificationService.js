import api, { unwrapList } from './api';

// Notifications created whenever an approval-engine request (leave, payroll,
// loans, documents, profile updates, etc.) reaches its FINAL approval while
// the caller holds a job role flagged "notify on final approval" — personal
// scope only, same shape as payrollService.listMyPayslips.
export const finalApprovalNotificationService = {
  listMine: () =>
    api.get('/api/final-approval-notifications/me').then((res) => unwrapList(res, ['notifications'])),
  markRead: (id) => api.post(`/api/final-approval-notifications/${id}/read`, {}),
  markAllRead: () => api.post('/api/final-approval-notifications/mark-all-read', {}),
};
