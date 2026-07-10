import api from './api';

const unwrapList = (res) =>
  Array.isArray(res) ? res : res?.logs || res?.audit_logs || res?.items || res?.data || [];

export const auditService = {
  // GET /api/audit-logs/ — most recent first, limit capped at 500 by the API.
  list: (limit = 200) => api.get(`/api/audit-logs/?limit=${Math.min(limit, 500)}`).then(unwrapList),
};
