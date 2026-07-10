// Inclusive calendar days between two ISO dates ("2026-07-20" → "2026-07-24" = 5).
// Returns 0 for missing/invalid dates.
export function inclusiveDays(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
