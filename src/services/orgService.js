import api from './api';


const PAGE_LIMIT = 100;
const MAX_PAGES = 50; // safety stop at 5,000 users

const pageUsers = (res) => (Array.isArray(res) ? res : res?.users || []);

export const orgService = {
  listUsersPage: (page = 1, limit = PAGE_LIMIT) =>
    api.get(`/api/users/?page=${page}&limit=${limit}`),

  sendOnboardingLink: (email) =>
    api.post("/api/users/onboarding-link", { email }),

  listDirectory: () =>
    api.get("/api/users/directory").then((res) => (Array.isArray(res) ? res : res?.users || [])),

  // Organization workforce aggregates for the HR/executive dashboard, computed
  // in SQL server-side (no client-side counting over the roster). EMPLOYEE:read.
  getOrgStats: () => api.get("/api/users/org-stats"),

  // Full single-employee record (biodata, bank, education, employment) — admin.
  getEmployee: (id) => api.get(`/api/users/${id}`),

  // Employee sub-records (next of kin, family, dependants, experience, training).
  getEmployeeRecords: (id) => api.get(`/api/users/${id}/records`),

  listAllUsers: async () => {
    const first = await orgService.listUsersPage(1);
    const users = pageUsers(first);
    const totalPages = first?.pagination?.totalPages || 1;
    const last = Math.min(totalPages, MAX_PAGES);
    if (last > 1) {
      const rest = await Promise.all(
        Array.from({ length: last - 1 }, (_, i) => orgService.listUsersPage(i + 2))
      );
      rest.forEach((r) => users.push(...pageUsers(r)));
    }
    if (totalPages > MAX_PAGES) {
      console.warn(`[orgService] Roster truncated at ${MAX_PAGES * PAGE_LIMIT} users.`);
    }
    return users;
  },
};
