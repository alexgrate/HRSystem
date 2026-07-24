import api, { unwrapList } from './api';

// Administration periods gate leave requests: a request's full date range
// must sit inside one active or scheduled period, and leave-type day budgets
// are consumed per period. Periods never overlap; statuses (scheduled →
// active → completed) advance automatically by date on every backend read —
// there is no close/edit endpoint.
export const administrationPeriodService = {
  // Admin-only: every period for the organization, newest first.
  list: () => api.get('/api/administration-periods/').then((res) => unwrapList(res, ['periods'])),
  // Any employee: the period covering today, or null when none is open.
  current: () => api.get('/api/administration-periods/current'),
  // Admin-only: opens an active period running from today to end_date.
  openNow: ({ name, end_date }) =>
    api.post('/api/administration-periods/open', { name: name || undefined, end_date }),
  // Admin-only: future period (auto-active if the range covers today).
  schedule: ({ name, start_date, end_date }) =>
    api.post('/api/administration-periods/schedule', { name: name || undefined, start_date, end_date }),
};

// Date-only helpers for period windows ('YYYY-MM-DD' semantics; the API
// serializes date columns as full ISO timestamps, so always slice first).
export const periodDate = (d) => (d ? String(d).slice(0, 10) : '');
export const rangeInsidePeriod = (start, end, period) => {
  if (!period) return false;
  const ps = periodDate(period.start_date);
  const pe = periodDate(period.end_date);
  return !!(start && end && ps && pe && ps <= start && end <= pe);
};
