import platformApi, { unwrapList } from './platformApi';

export const platformLoanAgreementService = {
  getActive: () => platformApi.get('/api/platform/loan-agreement/active'),
  listVersions: () => platformApi.get('/api/platform/loan-agreement/versions').then((res) => unwrapList(res, ['versions'])),
  preview: (content) => platformApi.post('/api/platform/loan-agreement/preview', { content }),
  publish: (data) => platformApi.post('/api/platform/loan-agreement', data),
  restoreVersion: (version) => platformApi.post(`/api/platform/loan-agreement/versions/${version}/restore`, {}),
};
