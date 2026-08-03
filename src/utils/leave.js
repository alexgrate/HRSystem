// Working-day (Mon-Fri) count between two ISO dates, inclusive of both ends
// ("2026-07-20" [Mon] → "2026-07-24" [Fri] = 5; a range spanning a weekend
// excludes Saturday/Sunday). Returns 0 for missing/invalid dates.
// Uses getUTCDay()/setUTCDate() since "YYYY-MM-DD" strings parse as UTC
// midnight — local-time getDay() would misclassify the weekend boundary on a
// non-UTC client.
export function workingDays(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  let count = 0;
  const cursor = new Date(a);
  while (cursor.getTime() <= b.getTime()) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
