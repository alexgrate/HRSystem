import platformApi, { unwrapList } from './platformApi';

export const platformAuthService = {
  me: () => platformApi.get('/api/platform/auth/me'),
  createAdmin: (data) => platformApi.post('/api/platform/auth/admins', data),
  listAdmins: () => platformApi.get('/api/platform/auth/admins').then((res) => unwrapList(res, ['admins'])),
};
