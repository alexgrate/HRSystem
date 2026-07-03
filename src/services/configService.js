import api from './api';

export const configService = {
  get: () => api.get('/api/system-configuration'),
  update: (data) => api.put('/api/system-configuration', data),
  create: (data) => api.post('/api/system-configuration', data),
};
