// Centralized notification formatter — the ONE place that turns backend events
// (org audit-log actions like `leave_request.updated`, or an employee's own
// record state changes) into human-readable notifications. No component or
// widget should map event strings itself. Users never see raw HTTP verbs,
// paths, or `resource.verb` tokens — only meaningful language.

const READ_KEY = "dash.notif.read.v1";

export const loadReadSet = () => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
  catch { return new Set(); }
};
export const persistReadSet = (set) => {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...set].slice(-800))); }
  catch { /* storage unavailable — read-state simply won't persist */ }
};

// resource_type → { iconKey, route, noun }. iconKey is resolved to a real icon
// by the rendering component (keeps this module icon-library-agnostic).
const RESOURCE_META = {
  leave_request: { iconKey: "leave", route: "/app/approvals", noun: "Leave request" },
  loan_request: { iconKey: "loan", route: "/app/loans", noun: "Loan" },
  loan_repayment: { iconKey: "loan", route: "/app/loans", noun: "Loan repayment" },
  loan_repayment_config: { iconKey: "loan", route: "/app/loans", noun: "Loan repayment settings" },
  loan_policy: { iconKey: "loan", route: "/app/loans", noun: "Loan policy" },
  loan_type: { iconKey: "loan", route: "/app/loans", noun: "Loan type" },
  loan_product_type: { iconKey: "loan", route: "/app/loans", noun: "Loan product" },
  payroll_run: { iconKey: "payroll", route: "/app/payroll", noun: "Payroll" },
  payroll_adjustment: { iconKey: "payroll", route: "/app/payroll", noun: "Payroll adjustment" },
  appraisal_review: { iconKey: "appraisal", route: "/app/appraisals", noun: "Appraisal" },
  appraisal_review_item: { iconKey: "appraisal", route: "/app/appraisals", noun: "Appraisal item" },
  appraisal_appeal: { iconKey: "appeal", route: "/app/appraisals", noun: "Appraisal appeal" },
  appraisal_cycle: { iconKey: "appraisal", route: "/app/appraisals", noun: "Appraisal cycle" },
  appraisal_target: { iconKey: "appraisal", route: "/app/appraisals", noun: "Appraisal target" },
  department: { iconKey: "people", route: "/app/directory", noun: "Department" },
  job_role: { iconKey: "people", route: "/app/directory", noun: "Job role" },
  employee: { iconKey: "people", route: "/app/directory", noun: "Employee" },
  office_location: { iconKey: "setup", route: "/app/directory", noun: "Office location" },
  grade: { iconKey: "setup", route: "/app/directory", noun: "Grade" },
  pay_grade: { iconKey: "setup", route: "/app/directory", noun: "Pay grade" },
  pay_group: { iconKey: "setup", route: "/app/directory", noun: "Pay group" },
  benefit_level: { iconKey: "setup", route: "/app/directory", noun: "Benefit level" },
  performance_indicator: { iconKey: "appraisal", route: "/app/appraisals", noun: "Performance indicator" },
  department_performance_indicator: { iconKey: "appraisal", route: "/app/appraisals", noun: "Department indicator" },
  profile_update_request: { iconKey: "document", route: "/app/approvals", noun: "Profile update" },
  profile_update_item: { iconKey: "document", route: "/app/approvals", noun: "Profile update" },
  profile_permission: { iconKey: "document", route: "/app/settings", noun: "Profile permission" },
  document: { iconKey: "document", route: "/app/approvals", noun: "Document" },
  organization: { iconKey: "org", route: "/app/settings", noun: "Organization" },
  system_configuration: { iconKey: "setup", route: "/app/settings", noun: "System configuration" },
  approval_request: { iconKey: "approval", route: "/app/approvals", noun: "Approval" },
  approval: { iconKey: "approval", route: "/app/workflows", noun: "Approval request" },
};

// Human past-tense phrasing for a verb (fallback when there's no full override).
const VERB = {
  created: "created", updated: "updated", deleted: "removed", submitted: "submitted",
  published: "published", acknowledged: "acknowledged", completed: "completed",
  called_up: "started", requested: "submitted", resolved: "resolved",
  approved: "approved", auto_approved: "approved", disbursed: "disbursed",
  rated: "scored", indicators_locked: "locked", reviewer_assignment_updated: "updated",
  field_changed: "updated", changed: "changed", payroll_repayments_recorded: "processed",
  employment_change_applied: "updated",
};

// Full-phrase overrides for the clearest wording (matches the product's voice).
const OVERRIDE = {
  "leave_request.created": "Leave request submitted",
  "leave_request.updated": "Leave request reviewed",
  "leave_request.deleted": "Leave request cancelled",
  "loan_request.created": "Loan application submitted",
  "loan_request.auto_approved": "Loan approved",
  "loan_request.disbursed": "Loan disbursed",
  "loan_request.deleted": "Loan request cancelled",
  "loan.payroll_repayments_recorded": "Loan repayments processed",
  "appraisal_review.called_up": "Appraisal started",
  "appraisal_review.completed": "Appraisal completed",
  "appraisal_review.published": "Appraisal published",
  "appraisal_review.acknowledged": "Appraisal acknowledged",
  "appraisal_appeal.requested": "Appeal submitted",
  "appraisal_appeal.resolved": "Appeal resolved",
  "appraisal_cycle.indicators_locked": "Appraisal indicators locked",
  "payroll_run.updated": "Payroll updated",
  "payroll_adjustment.created": "Payroll adjustment added",
  "payroll_adjustment.updated": "Payroll adjustment reviewed",
  "profile_update_request.created": "Profile update requested",
  "profile_update_request.updated": "Profile update reviewed",
  "employee.field_changed": "Employee record updated",
  "employee_status.changed": "Employee status changed",
  "approval.request.approved": "Request approved",
  "approval.request.rejected": "Request rejected",
  "approval.request.state_changed": "Request updated",
};

const titleize = (s) => String(s || "").replace(/[_.-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();

// Turn one org audit-log row into a notification. Never surfaces the raw action.
export function formatAuditLog(log) {
  const action = String(log.action || "");
  const dot = action.indexOf(".");
  const resource = dot > 0 ? action.slice(0, dot) : (log.resource_type || action);
  const verb = dot > 0 ? action.slice(dot + 1) : "";
  const meta = RESOURCE_META[resource] || RESOURCE_META[log.resource_type] || { iconKey: "generic", route: "/app", noun: titleize(resource) };
  const title = OVERRIDE[action] || `${meta.noun} ${VERB[verb] || (verb ? titleize(verb).toLowerCase() : "updated")}`.trim();
  return { id: String(log.id), title, description: meta.noun, iconKey: meta.iconKey, route: meta.route, at: log.created_at };
}

// Build an employee's personal notifications from their OWN records (self-scoped,
// real timestamps). Same formatter, so wording stays consistent everywhere.
export function buildPersonalNotifications({ reviews = [], leave = [], loans = [], myEmployeeId }) {
  const out = [];
  for (const r of reviews) {
    if (r.employee_id === myEmployeeId && r.published_at)
      out.push({ id: `rev-${r.id}`, title: "Your appraisal was published", description: r.cycle_name || "Appraisal", iconKey: "appraisal", route: "/app/appraisals", at: r.published_at });
    if (r.employee_id === myEmployeeId && r.acknowledged_at)
      out.push({ id: `rev-ack-${r.id}`, title: "You acknowledged your appraisal", description: r.cycle_name || "Appraisal", iconKey: "appraisal", route: "/app/appraisals", at: r.acknowledged_at });
  }
  for (const l of leave) {
    if (l.approved_at) out.push({ id: `lv-a-${l.id}`, title: "Leave request approved", description: l.leave_type_name || "Leave", iconKey: "leave", route: "/app/self-service", at: l.approved_at });
    else if (l.rejected_at) out.push({ id: `lv-r-${l.id}`, title: "Leave request declined", description: l.leave_type_name || "Leave", iconKey: "leave", route: "/app/self-service", at: l.rejected_at });
  }
  for (const l of loans) {
    if (l.approved_at) out.push({ id: `ln-a-${l.id}`, title: "Loan approved", description: "Loan application", iconKey: "loan", route: "/app/self-service", at: l.approved_at });
    if (l.disbursed_at) out.push({ id: `ln-d-${l.id}`, title: "Loan disbursed", description: "Funds released", iconKey: "loan", route: "/app/self-service", at: l.disbursed_at });
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// Group notifications into Today / Yesterday / Earlier This Week / Older, in order.
export function groupByRecency(items) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  const buckets = { Today: [], Yesterday: [], "Earlier this week": [], Older: [] };
  for (const it of items) {
    const t = new Date(it.at).getTime();
    if (Number.isNaN(t)) { buckets.Older.push(it); continue; }
    if (t >= startOfToday) buckets.Today.push(it);
    else if (t >= startOfToday - dayMs) buckets.Yesterday.push(it);
    else if (t >= startOfToday - 6 * dayMs) buckets["Earlier this week"].push(it);
    else buckets.Older.push(it);
  }
  return Object.entries(buckets).filter(([, arr]) => arr.length).map(([label, arr]) => ({ label, items: arr }));
}
