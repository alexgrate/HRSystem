import platformApi from './platformApi';

export const platformAnalyticsService = {
  getOverview: () => platformApi.get('/api/platform/analytics/overview'),
};
