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

export const extractRunLines = (detail) => {
  const d = detail || {};
  const candidates = [d.items, d.payslips, d.lines, d.entries, d.run?.items, d.run?.payslips];
  return candidates.find((c) => Array.isArray(c) && c.length) || [];
};

// Canonical payroll run lifecycle presentation — the single source for status
// labels/badges/steps so every screen renders runs the same way.
export const RUN_STATUS_META = {
  draft: { label: "Draft", cls: "bg-sunken text-ink-muted", step: 0 },
  preview_generated: { label: "Preview ready", cls: "bg-sky-50 text-sky-700", step: 1 },
  submitted_pending_approval: { label: "Awaiting approval", cls: "bg-amber-50 text-amber-700", step: 2 },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700", step: 3 },
  lock_in_pending_approval: { label: "Lock-in pending", cls: "bg-amber-50 text-amber-700", step: 4 },
  locked_in: { label: "Locked in", cls: "bg-violet-50 text-violet-700", step: 5 },
  distribution_pending_approval: { label: "Distribution pending", cls: "bg-amber-50 text-amber-700", step: 6 },
  distributed: { label: "Distributed", cls: "bg-emerald-600 text-white", step: 7 },
};

export const runStatusMeta = (status) =>
  RUN_STATUS_META[status] || { label: status || "Unknown", cls: "bg-sunken text-ink-muted", step: 0 };

export const lineAmounts = (l) => ({
  base: l.base_salary ?? l.base,
  allowances: l.allowances_total ?? l.allowances,
  deductions: l.deductions_total ?? l.total_deductions ?? l.deductions,
  gross: l.gross_salary ?? l.gross,
  net: l.net_salary ?? l.net_pay ?? l.net ?? l.total_net,
  // Loan repayments are folded into the deductions total by the backend; the
  // preview stamps the loan portion on the item snapshot so it can be itemized.
  loanDeductions: Number(l.snapshot?.loan_deductions ?? l.loan_deductions ?? 0) || 0,
  loanCount: Number(l.snapshot?.loan_deduction_count ?? l.loan_deduction_count ?? 0) || 0,
});
