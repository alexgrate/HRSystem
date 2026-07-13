import api from './api';

// Org roster fetches for screens that need the complete user list (name
// resolution, manager pickers, assignment tables, client-side search).
// GET /api/users/ caps `limit` at 100 and offers no server-side search or
// department filter, so completeness means walking the pages via the
// response's pagination metadata.
const PAGE_LIMIT = 100;
const MAX_PAGES = 50; // safety stop at 5,000 users

const pageUsers = (res) => (Array.isArray(res) ? res : res?.users || []);

export const orgService = {
  listUsersPage: (page = 1, limit = PAGE_LIMIT) =>
    api.get(`/api/users/?page=${page}&limit=${limit}`),

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
