import { apiClient } from './client';

export const auditApi = {
  // Get audit logs with filter parameters (action, user_id, limit, offset)
  getAuditLogs: async (params = {}) => {
    return apiClient.get('/audit-logs', { params });
  },
};
