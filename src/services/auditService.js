import api, { unwrapList } from './api';

export const auditService = {
  // GET /api/audit-logs/ — most recent first, limit capped at 500 by the API.
  list: (limit = 200) =>
    api.get(`/api/audit-logs/?limit=${Math.min(limit, 500)}`).then((res) => unwrapList(res, ['logs', 'audit_logs'])),
};
