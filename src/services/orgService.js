import api from './api';


const PAGE_LIMIT = 100;
const MAX_PAGES = 50; // safety stop at 5,000 users

const pageUsers = (res) => (Array.isArray(res) ? res : res?.users || []);

export const orgService = {
  listUsersPage: (page = 1, limit = PAGE_LIMIT) =>
    api.get(`/api/users/?page=${page}&limit=${limit}`),

  sendOnboardingLink: (email) =>
    api.post("/api/users/onboarding-link", { email }),

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
