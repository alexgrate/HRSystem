export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const fmtMoney = (v, currency = "NGN") => {
  const n = Number(v) || 0;
  // Guard against invalid stored currency values (e.g. a number typed into
  // the old free-text field) — fall back to naira rather than printing junk.
  const cur = /^[A-Za-z]{2,4}$/.test(String(currency || "")) ? String(currency).toUpperCase() : "NGN";
  return `${cur === "NGN" ? "₦" : `${cur} `}${n.toLocaleString()}`;
};

// Payslip lines: GET /runs/{id} returns { run, items } where each item
// carries base_salary / allowances_total / deductions_total / gross_salary /
// net_salary and a snapshot with the employee's name at run time. Older
// responses have used other keys, so probe the shapes seen in the wild.
export const extractRunLines = (detail) => {
  const d = detail || {};
  const candidates = [d.items, d.payslips, d.lines, d.entries, d.run?.items, d.run?.payslips];
  return candidates.find((c) => Array.isArray(c) && c.length) || [];
};

// A run line's employee_id is the org user record id, but tolerate auth_id /
// staff_id / email so a backend shape change degrades to "not found" rather
// than showing someone else's pay.
export const findEmployeeLine = (lines, user) => {
  if (!user || !Array.isArray(lines)) return null;
  const ids = [user.id, user.auth_id, user.staff_id].filter(Boolean).map(String);
  const email = String(user.email || "").toLowerCase();
  return (
    lines.find((l) => ids.includes(String(l.employee_id ?? l.user_id ?? ""))) ||
    (email &&
      lines.find(
        (l) => String(l.employee?.email || l.snapshot?.email || "").toLowerCase() === email
      )) ||
    null
  );
};

export const lineAmounts = (l) => ({
  base: l.base_salary ?? l.base,
  allowances: l.allowances_total ?? l.allowances,
  deductions: l.deductions_total ?? l.total_deductions ?? l.deductions,
  gross: l.gross_salary ?? l.gross,
  net: l.net_salary ?? l.net_pay ?? l.net ?? l.total_net,
});
