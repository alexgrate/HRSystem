import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, X, AlertCircle, Check, CheckCircle2, Settings2, Trash2 } from "lucide-react";
import { payrollService, findApprovalRequestId } from "../../services/payrollService";
import { setupService } from "../../services/setupService";
import { usePermissions } from "../../context/PermissionContext";
import { useConfig } from "../../context/ConfigContext";
import { useAuth } from "../../context/AuthContext";
import { isDesignatedApprover } from "../../utils/approvers";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { getEmployeeName } from "../../utils/employee";
import { MONTHS, fmtMoney, extractRunLines, runStatusMeta } from "../../utils/payroll";
import { orgService } from "../../services/orgService";

const MILESTONES = [
  { label: "Preview", at: 1 },
  { label: "Approval", at: 3 },
  { label: "Lock-in", at: 5 },
  { label: "Distribution", at: 7 },
];

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

// Builds a hover tooltip listing each configured line item of the given type
// (and its computed amount for this employee) — same idea as the existing
// loan-deduction tooltip, just generalized to named, admin-configured items.
const lineItemsTooltip = (lineItems, itemType, currency) => {
  // sum_of rows that merely restate other rows are subtotals — omit them so
  // nothing appears to be counted twice.
  const matches = (Array.isArray(lineItems) ? lineItems : []).filter((li) => li.item_type === itemType && !li.is_subtotal);
  if (matches.length === 0) return undefined;
  return matches.map((li) => `${li.name}: ${fmtMoney(li.amount, currency)}`).join("\n");
};

// ── Payroll schedule export ────────────────────────────────────────────────
// One row per employee in the same layout finance reconciles: days, annual
// gross, every earning component, gross pay, every employer cost, staff cost,
// every deduction, total deduction, net pay, then bank and statutory IDs.
// Columns come from the line items actually on the run (in configured order),
// so a pay grade with extra items gets extra columns.
const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(2) : "";
  const t = String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

function buildPayrollScheduleCsv(lines) {
  const order = { remuneration: [], employer_contribution: [], deduction: [] };
  const seen = new Set();
  lines.forEach((l) =>
    (l.snapshot?.line_items || []).forEach((li) => {
      if (li.is_subtotal || li.is_balance) return;
      const bucket = order[li.item_type];
      const key = `${li.item_type}:${li.name}`;
      if (bucket && !seen.has(key)) { seen.add(key); bucket.push(li.name); }
    }),
  );
  const hasBalance = lines.some((l) => (l.snapshot?.line_items || []).some((li) => li.is_balance && Number(li.amount) > 0));
  const hasAllowance = lines.some((l) => Number(l.allowances_total) > 0);
  const hasLoans = lines.some((l) => Number(l.snapshot?.loan_deductions) > 0);
  const hasAdjust = lines.some((l) => Number(l.adjustments_total) !== 0 && l.adjustments_total != null);

  const header = [
    "S/N", "Name", "Staff ID", "Residence", "No. days worked", "No. working days in the month", "Annual gross",
    ...order.remuneration, ...(hasBalance ? ["Balance of base salary"] : []), ...(hasAllowance ? ["Benefit allowances"] : []),
    "Gross pay",
    ...order.employer_contribution, "Staff cost",
    ...order.deduction, ...(hasLoans ? ["Loan repayment"] : []), ...(hasAdjust ? ["Adjustments"] : []),
    "Total deduction", "Net pay", "Bank", "Account number", "PAYE ID", "Pension ID", "PFA",
  ];

  const rows = lines.map((l, i) => {
    const sn = l.snapshot || {};
    const amt = (type, name) =>
      (sn.line_items || []).filter((li) => li.item_type === type && li.name === name && !li.is_subtotal).reduce((a, li) => a + (Number(li.amount) || 0), 0);
    const gross = Number(l.gross_salary ?? sn.gross_pay ?? 0);
    const employer = Number(sn.employer_contributions ?? 0);
    const balance = (sn.line_items || []).filter((li) => li.is_balance).reduce((a, li) => a + (Number(li.amount) || 0), 0);
    return [
      i + 1,
      sn.employee_name || l.employee_name || "",
      sn.staff_id || "",
      sn.residence || "",
      sn.days_worked ?? "",
      sn.working_days ?? "",
      sn.annual_gross != null ? Number(sn.annual_gross) : Number(l.base_salary || 0) * 12,
      ...order.remuneration.map((n) => amt("remuneration", n)),
      ...(hasBalance ? [balance] : []),
      ...(hasAllowance ? [Number(l.allowances_total) || 0] : []),
      gross,
      ...order.employer_contribution.map((n) => amt("employer_contribution", n)),
      sn.staff_cost != null ? Number(sn.staff_cost) : gross + employer,
      ...order.deduction.map((n) => amt("deduction", n)),
      ...(hasLoans ? [Number(sn.loan_deductions) || 0] : []),
      ...(hasAdjust ? [Number(l.adjustments_total) || 0] : []),
      Number(l.deductions_total ?? 0),
      Number(l.net_salary ?? 0),
      sn.bank_name || "",
      sn.account_number ? `'${sn.account_number}` : "",
      sn.paye_id || "",
      sn.pension_id || "",
      sn.pfa || "",
    ];
  });

  const total = (idx) => rows.reduce((a, r) => a + (typeof r[idx] === "number" ? r[idx] : 0), 0);
  const totalsRow = header.map((h, idx) => {
    if (idx === 1) return "TOTAL";
    if (idx < 6 || idx >= header.length - 5) return "";
    return total(idx);
  });

  return [header, ...rows, totalsRow].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

const actionsForStatus = (status) => {
  switch (status) {
    case "draft":
    case "preview_generated":
      return [{ key: "submit", label: "Submit for approval", perm: "submit", confirmMsg: "Submit this payroll run for approval?", exec: (id) => payrollService.submitRun(id) }];
    case "submitted_pending_approval":
      // Each lifecycle action is its own backend permission (PAYROLL_RUN:approve,
      // :reject, etc.) — the isDesignatedApprover check below additionally
      // restricts sign-off to the workflow's designated approver.
      return [
        { key: "approve", label: "Approve payroll", perm: "approve", approve: true, exec: (id, aid, c) => payrollService.approveRun(id, aid, c) },
        { key: "reject", label: "Reject payroll", perm: "reject", approve: true, danger: true, exec: (id, aid, c) => payrollService.rejectRun(id, aid, c) },
      ];
    case "approved":
      return [{ key: "lock", label: "Request lock-in", perm: "request-lock-in", confirmMsg: "Request lock-in? A locked run can no longer be adjusted.", exec: (id) => payrollService.requestLockIn(id) }];
    case "lock_in_pending_approval":
      return [
        { key: "approve-lock", label: "Approve lock-in", perm: "approve-lock-in", approve: true, exec: (id, aid, c) => payrollService.approveLockIn(id, aid, c) },
        { key: "reject-lock", label: "Reject lock-in", perm: "reject-lock-in", approve: true, danger: true, exec: (id, aid, c) => payrollService.rejectLockIn(id, aid, c) },
      ];
    case "locked_in":
      return [{ key: "distribute", label: "Request distribution", perm: "request-distribution", confirmMsg: "Request distribution? Employees will be notified of their payslips once approved.", exec: (id) => payrollService.requestDistribution(id) }];
    case "distribution_pending_approval":
      return [
        { key: "approve-dist", label: "Approve distribution", perm: "approve-distribution", approve: true, exec: (id, aid, c) => payrollService.approveDistribution(id, aid, c) },
        { key: "reject-dist", label: "Reject distribution", perm: "reject-distribution", approve: true, danger: true, exec: (id, aid, c) => payrollService.rejectDistribution(id, aid, c) },
      ];
    default:
      return [];
  }
};

const PayrollPage = () => {
  const { can, isAdmin, reliefCoveringJobRoleIds, isManager, isDepartmentHead } = usePermissions();
  const { user } = useAuth();
  const { config } = useConfig();
  const toast = useToast();
  const confirm = useConfirm();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [detailState, setDetailState] = useState({ forId: null, data: null });
  const [adjustments, setAdjustments] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [staff, setStaff] = useState([]);
  const [payGroups, setPayGroups] = useState([]);
  const [payGrades, setPayGrades] = useState([]);
  const [workflows, setWorkflows] = useState(null); // null = unknown (approve buttons stay hidden for non-admins)

  const [showNewRun, setShowNewRun] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showLineItems, setShowLineItems] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [colValueBusyKey, setColValueBusyKey] = useState(null); // `${columnId}:${employeeId}` while saving
  const [busy, setBusy] = useState(false);

  const canCreate = can("PAYROLL_RUN", "create");
  const canUpdate = can("PAYROLL_RUN", "update");
  const canManage = can("PAYROLL_RUN", "manage");
  const canDeleteRun = can("PAYROLL_RUN", "delete");
  // Adjustments are a SEPARATE backend RBAC resource (PAYROLL_ADJUSTMENT), not
  // PAYROLL_RUN, with its own create/submit/approve/reject actions.
  const canAdjCreate = can("PAYROLL_ADJUSTMENT", "create");
  const canAdjSubmit = can("PAYROLL_ADJUSTMENT", "submit");
  const canAdjReview = can("PAYROLL_ADJUSTMENT", "approve") || can("PAYROLL_ADJUSTMENT", "reject");
  const canLineItemRead = can("PAYROLL_LINE_ITEM", "read");
  // Custom columns are their own backend RBAC resource (PAYROLL_CUSTOM_COLUMN).
  const canColCreate = can("PAYROLL_CUSTOM_COLUMN", "create");
  const canColUpdate = can("PAYROLL_CUSTOM_COLUMN", "update");
  const canColDelete = can("PAYROLL_CUSTOM_COLUMN", "delete");

  // Mirror of selectedId readable inside async callbacks, so a detail write
  // can check the selection hasn't moved on since the fetch started.
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const detail = selectedId && detailState.forId === selectedId ? detailState.data : null;
  const detailLoading = !!selectedId && detailState.forId !== selectedId;

  const selectedRun = useMemo(() => {
    const fromDetail = detail?.run || (detail?.id ? detail : null);
    return fromDetail || runs.find((r) => r.id === selectedId) || null;
  }, [detail, runs, selectedId]);

  const loadRuns = async () => {
    try {
      const list = await payrollService.listRuns();
      setRuns(list);
      return list;
    } catch (err) {
      console.error("[Payroll] Failed to load runs:", err);
      toast.error(err?.message || "Couldn't load payroll runs.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async () => {
    try {
      setAdjustments(await payrollService.listAdjustments());
    } catch (err) {
      console.error("[Payroll] Failed to load adjustments:", err);
    }
  };

  const loadCustomColumns = async (runId) => {
    if (!runId) { setCustomColumns([]); return; }
    try {
      setCustomColumns(await payrollService.listCustomColumns(runId));
    } catch (err) {
      console.error("[Payroll] Failed to load custom columns:", err);
    }
  };

  useEffect(() => {
    let stale = false;
    loadRuns();
    loadAdjustments();
    (async () => {
      // The users list is admin-gated — non-admin payroll approvers get names
      // from the run items' snapshots instead, so don't even ask.
      if (!can("EMPLOYEE", "read")) return;
      try {
        const res = await orgService.listAllUsers();
        if (!stale) setStaff(res);
      } catch (err) {
        console.error("[Payroll] Staff list unavailable:", err);
      }
    })();
    (async () => {
      try {
        const groups = await setupService.getPayGroups();
        if (!stale) setPayGroups(Array.isArray(groups) ? groups : []);
      } catch (err) {
        console.error("[Payroll] Pay groups unavailable:", err);
      }
    })();
    (async () => {
      try {
        const grades = await setupService.getPayGrades();
        if (!stale) setPayGrades(Array.isArray(grades) ? grades : []);
      } catch (err) {
        console.error("[Payroll] Pay grades unavailable:", err);
      }
    })();
    (async () => {
      try {
        const flows = await setupService.getWorkflows();
        if (!stale) setWorkflows(Array.isArray(flows) ? flows : null);
      } catch {
        /* can't read workflows — approve buttons fall back to permission gate */
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load run detail (which should carry the pending approval_request_id).
  useEffect(() => {
    if (!selectedId) return;
    let stale = false;
    payrollService.getRun(selectedId)
      .then((res) => { if (!stale) setDetailState({ forId: selectedId, data: res }); })
      .catch((err) => {
        console.error("[Payroll] Failed to load run detail:", err);
        if (!stale) setDetailState({ forId: selectedId, data: null });
      });
    loadCustomColumns(selectedId);
    return () => { stale = true; };
  }, [selectedId]);

  const refreshAfterAction = async () => {
    // The run in view when the refresh began. If the user selects another run
    // while this is in flight, a late write here would land forId != selectedId
    // and wedge the detail panel on "Loading…" permanently — so re-check the
    // selection before every write.
    const runId = selectedIdRef.current;
    await Promise.all([loadRuns(), loadAdjustments(), loadCustomColumns(runId)]);
    if (runId && selectedIdRef.current === runId) {
      try {
        const data = await payrollService.getRun(runId);
        if (selectedIdRef.current === runId) setDetailState({ forId: runId, data });
      } catch { /* keep old detail */ }
    }
  };

  const runPlainAction = async (action) => {
    if (action.confirmMsg) {
      const ok = await confirm({ title: action.label, message: action.confirmMsg, confirmLabel: action.label });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await action.exec(selectedRun.id);
      toast.success(`${action.label} — done.`);
      await refreshAfterAction();
    } catch (err) {
      console.error("[Payroll] Action failed:", err);
      toast.error(err?.message || `${action.label} failed.`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!selectedRun) return;
    const ok = await confirm({
      title: "Delete this payroll run?",
      message: `This permanently deletes the ${MONTHS[(selectedRun.month || 1) - 1]} ${selectedRun.year} · ${payGroupName(selectedRun.pay_group)} run, along with its line items, adjustments and notifications. This cannot be undone.`,
      confirmLabel: "Delete run",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await payrollService.deleteRun(selectedRun.id);
      toast.success("Payroll run deleted.");
      setSelectedId(null);
      setDetailState({ forId: null, data: null });
      await loadRuns();
    } catch (err) {
      console.error("[Payroll] Delete run failed:", err);
      toast.error(err?.message || "Couldn't delete the payroll run.");
    } finally {
      setBusy(false);
    }
  };

  const runApproveAction = async (comment) => {
    const { action, target, id } = approveModal;
    const source = target === "adjustment" ? adjustments.find((a) => a.id === id) : detail;
    const approvalRequestId = findApprovalRequestId(source);
    if (!approvalRequestId) {
      toast.error("The pending approval request id isn't in the API response — ask the backend to include it on the run/adjustment payload.");
      return;
    }
    setBusy(true);
    try {
      await action.exec(id, approvalRequestId, comment);
      toast.success(`${action.label} — done.`);
      setApproveModal(null);
      await refreshAfterAction();
    } catch (err) {
      console.error("[Payroll] Approval failed:", err);
      toast.error(err?.message || `${action.label} failed.`);
    } finally {
      setBusy(false);
    }
  };

  const runAdjustments = useMemo(
    () => (selectedRun ? adjustments.filter((a) => a.payroll_run_id === selectedRun.id) : []),
    [adjustments, selectedRun]
  );

  const runLines = useMemo(() => extractRunLines(detail), [detail]);

  // Days worked can be changed per person while the run is still a preview;
  // recalculating re-generates the preview with those days.
  const [daysEdits, setDaysEdits] = useState({});
  useEffect(() => { setDaysEdits({}); }, [selectedId]);
  const daysEditable = !!selectedRun && canCreate && ["draft", "preview_generated"].includes(selectedRun.status);
  const workingDaysForRun = runLines.find((l) => l.snapshot?.working_days != null)?.snapshot?.working_days ?? null;
  const pendingDayEdits = Object.keys(daysEdits).length;

  const recalculateDays = async () => {
    if (!selectedRun) return;
    const days_worked = {};
    runLines.forEach((l) => {
      const current = l.snapshot?.days_worked;
      if (current != null) days_worked[l.employee_id] = Number(current);
    });
    for (const [id, v] of Object.entries(daysEdits)) {
      const n = Number(v);
      if (v === "" || !Number.isFinite(n) || n < 0) {
        toast.error("Days worked must be a number of 0 or more.");
        return;
      }
      if (workingDaysForRun != null && n > Number(workingDaysForRun)) {
        toast.error(`Days worked can't be more than the ${workingDaysForRun} working days in the month.`);
        return;
      }
      days_worked[id] = n;
    }
    setBusy(true);
    try {
      await payrollService.preview({
        month: selectedRun.month,
        year: selectedRun.year,
        pay_group: selectedRun.pay_group,
        currency: selectedRun.currency,
        working_days: workingDaysForRun ?? undefined,
        days_worked,
      });
      setDaysEdits({});
      await refreshAfterAction();
      toast.success("Payroll recalculated with the new days worked.");
    } catch (err) {
      toast.error(err?.message || "Couldn't recalculate the payroll.");
    } finally {
      setBusy(false);
    }
  };

  const downloadSchedule = () => {
    if (!selectedRun || runLines.length === 0) return;
    const csv = "\uFEFF" + buildPayrollScheduleCsv(runLines);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-schedule-${selectedRun.year}-${String(selectedRun.month).padStart(2, "0")}-${String(payGroupName(selectedRun.pay_group) || "group").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const staffCostTotal = useMemo(
    () =>
      runLines.reduce(
        (a, l) =>
          a + (l.snapshot?.staff_cost != null ? Number(l.snapshot.staff_cost) : Number(l.gross_salary || 0) + Number(l.snapshot?.employer_contributions || 0)),
        0,
      ),
    [runLines],
  );

  const staffName = (employeeId) => {
    const s = staff.find((u) => u.id === employeeId);
    if (s) return getEmployeeName(s);
    const line = runLines.find((l) => l.employee_id === employeeId);
    if (line?.snapshot?.employee_name) return line.snapshot.employee_name;
    return employeeId ? `${String(employeeId).slice(0, 8)}…` : "—";
  };

  // Runs may carry the pay group as a uuid — show the human name.
  const payGroupName = (v) => payGroups.find((g) => g.id === v || g.name === v)?.name || v;

  const saveColumnValue = async (columnId, employeeId, amount) => {
    const key = `${columnId}:${employeeId}`;
    setColValueBusyKey(key);
    try {
      await payrollService.setCustomColumnValue(columnId, { employee_id: employeeId, amount });
      toast.success("Value saved.");
      await refreshAfterAction();
    } catch (err) {
      console.error("[Payroll] Failed to save custom column value:", err);
      toast.error(err?.message || "Couldn't save the value.");
    } finally {
      setColValueBusyKey(null);
    }
  };

  const removeColumn = async (column) => {
    const ok = await confirm({
      title: "Remove this column?",
      message: `Remove "${column.name}" from this payroll? This reverses its amount for every employee who has one.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await payrollService.deleteCustomColumn(column.id);
      toast.success("Column removed.");
      await refreshAfterAction();
    } catch (err) {
      console.error("[Payroll] Failed to remove custom column:", err);
      toast.error(err?.message || "Couldn't remove the column.");
    } finally {
      setBusy(false);
    }
  };

  const meta = selectedRun ? runStatusMeta(selectedRun.status) : null;
  // Approve/reject only shows for the workflow's designated approver job
  // role (plus admins) — permission alone isn't the right to sign off.
  const STAGE_WORKFLOW_TYPE = {
    submitted_pending_approval: "PAYROLL_SUBMISSION",
    lock_in_pending_approval: "PAYROLL_LOCK_IN",
    distribution_pending_approval: "PAYROLL_DISTRIBUTION",
  };
  const actions = selectedRun
    ? actionsForStatus(selectedRun.status).filter(
        (a) =>
          can("PAYROLL_RUN", a.perm) &&
          (!a.approve || isDesignatedApprover(workflows, STAGE_WORKFLOW_TYPE[selectedRun.status], user, isAdmin, reliefCoveringJobRoleIds, isManager, isDepartmentHead))
      )
    : [];
  // Backend createPayrollAdjustment only accepts these run statuses (adjustments
  // open after approval and stay open through distribution approval).
  const adjustable = selectedRun
    ? ["approved", "locked_in", "distribution_pending_approval"].includes(selectedRun.status)
    : false;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Payroll Engine</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Payroll Processing</h1>
          <p className="mt-1 text-sm text-ink-muted">Preview, approve, lock in and distribute monthly payroll per pay group.</p>
        </div>
        <div className="flex items-center gap-2">
          {canLineItemRead && (
            <button
              onClick={() => setShowLineItems(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-sunken"
            >
              <Settings2 className="h-4 w-4" /> Line items
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setShowNewRun(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              <Plus className="h-4 w-4" /> Run payroll
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-ink-muted bg-card rounded-2xl border border-line-soft">Loading payroll runs…</div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-line rounded-2xl bg-card">
          <CheckCircle2 className="mx-auto h-12 w-12 text-ink-ghost" />
          <h3 className="mt-4 text-sm font-semibold text-ink">No payroll runs yet</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Press “Run payroll” to generate a preview for a month and pay group.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          {/* Runs list */}
          <div className="space-y-2">
            {runs.map((r) => {
              const m = runStatusMeta(r.status);
              const isSel = selectedId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    isSel ? "border-brand bg-gradient-to-br from-brand/5 to-card shadow-md" : "border-line/80 bg-card hover:border-line"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-ink">
                      {MONTHS[(r.month || 1) - 1]} {r.year}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${m.cls}`}>{m.label}</span>
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {payGroupName(r.pay_group)} · {r.total_employees ?? "—"} employees
                  </div>
                  <div className="mt-1 text-sm font-semibold text-brand">{fmtMoney(r.total_net, r.currency)} net</div>
                </button>
              );
            })}
          </div>

          {/* Run detail */}
          <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
            {!selectedRun ? (
              <div className="p-12 text-center text-ink-faint text-sm">Select a payroll run to see its lifecycle and actions.</div>
            ) : (
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-ink">
                      {MONTHS[(selectedRun.month || 1) - 1]} {selectedRun.year} · {payGroupName(selectedRun.pay_group)}
                    </h3>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {actions.map((a) => (
                      <button
                        key={a.key}
                        disabled={busy || detailLoading}
                        onClick={() =>
                          a.approve
                            ? setApproveModal({ action: { ...a, exec: a.exec }, target: "run", id: selectedRun.id })
                            : runPlainAction(a)
                        }
                        className={
                          a.danger
                            ? "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            : "rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                        }
                      >
                        {a.label}
                      </button>
                    ))}
                    {actions.length === 0 && selectedRun.status === "distributed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> Fully distributed
                      </span>
                    )}
                    {canDeleteRun && ["draft", "preview_generated"].includes(selectedRun.status) && (
                      <button
                        disabled={busy || detailLoading}
                        onClick={() => handleDeleteRun()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete run
                      </button>
                    )}
                  </div>
                </div>

                {/* Pipeline */}
                <div className="flex items-center gap-1">
                  {MILESTONES.map((ms, i) => {
                    const done = meta.step >= ms.at;
                    const active = meta.step === ms.at - 1;
                    return (
                      <React.Fragment key={ms.label}>
                        {i > 0 && <div className={`h-0.5 flex-1 rounded ${done || active ? "bg-brand/50" : "bg-slate-200"}`} />}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                              done ? "bg-brand text-white" : active ? "border-2 border-brand text-brand animate-pulse" : "border border-line text-ink-faint"
                            }`}
                          >
                            {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                          </div>
                          <span className={`text-[10px] font-semibold ${done || active ? "text-brand" : "text-ink-faint"}`}>{ms.label}</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Employees", selectedRun.total_employees ?? "—"],
                    ["Total gross", fmtMoney(selectedRun.total_gross, selectedRun.currency)],
                    ["Total net", fmtMoney(selectedRun.total_net, selectedRun.currency)],
                    ["Total staff cost", runLines.length ? fmtMoney(staffCostTotal, selectedRun.currency) : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-line p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
                      <div className="mt-0.5 text-sm font-bold text-ink">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Payslip lines, when the API provides them */}
                {detailLoading ? (
                  <div className="p-6 text-center text-xs text-ink-faint">Loading run details…</div>
                ) : runLines.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-ink-muted">
                        {workingDaysForRun != null ? `${workingDaysForRun} working days in the month. ` : ""}
                        {daysEditable ? "Change days worked for anyone who didn't work the full month, then recalculate." : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {pendingDayEdits > 0 && (
                          <>
                            <button onClick={() => setDaysEdits({})} disabled={busy} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-sunken">
                              Discard
                            </button>
                            <button onClick={recalculateDays} disabled={busy} className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                              {busy ? "Recalculating…" : `Recalculate (${pendingDayEdits} change${pendingDayEdits === 1 ? "" : "s"})`}
                            </button>
                          </>
                        )}
                        <button
                          onClick={downloadSchedule}
                          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-sunken"
                          title="Every employee with earnings, employer costs, deductions, net pay, account number, PAYE ID and pension details"
                        >
                          Download schedule (CSV)
                        </button>
                        {canColCreate && adjustable && (
                          <button
                            onClick={() => setShowColumnModal(true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-sunken"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add column
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-line">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-sunken/60 text-[10px] uppercase tracking-wider text-ink-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Employee</th>
                            <th className="px-3 py-2 text-right font-semibold">Days</th>
                            <th className="px-3 py-2 text-right font-semibold">Gross pay</th>
                            <th className="px-3 py-2 text-right font-semibold">Deductions</th>
                            <th className="px-3 py-2 text-right font-semibold">Net pay</th>
                            <th className="px-3 py-2 text-right font-semibold">Employer cost</th>
                            <th className="px-3 py-2 text-right font-semibold">Staff cost</th>
                            {customColumns.map((col) => (
                              <th key={col.id} className="px-3 py-2 text-right font-semibold">
                                <span className={col.item_type === "deduction" ? "text-red-500" : "text-emerald-600"}>{col.name}</span>
                                {!col.is_global && <span className="ml-1 normal-case text-[9px] text-ink-faint">(1 staff)</span>}
                                {canColDelete && adjustable && (
                                  <button
                                    onClick={() => removeColumn(col)}
                                    title={`Remove "${col.name}"`}
                                    className="ml-1 align-middle text-ink-faint hover:text-red-600"
                                  >
                                    <X className="inline h-3 w-3" />
                                  </button>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {runLines.map((l, i) => (
                            <tr key={l.id || i} className="border-t border-line-soft">
                              <td className="px-3 py-2 font-medium text-ink-2">
                                {l.snapshot?.employee_name || l.employee_name || getEmployeeName(l.employee, null) || staffName(l.employee_id)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {daysEditable && l.snapshot?.days_worked != null ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={workingDaysForRun ?? undefined}
                                    step="0.5"
                                    aria-label="Days worked"
                                    value={daysEdits[l.employee_id] ?? l.snapshot.days_worked}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setDaysEdits((prev) => {
                                        const next = { ...prev };
                                        if (String(v) === String(l.snapshot.days_worked)) delete next[l.employee_id];
                                        else next[l.employee_id] = v;
                                        return next;
                                      });
                                    }}
                                    className={`w-16 rounded-md border px-1.5 py-1 text-right text-xs ${daysEdits[l.employee_id] != null ? "border-brand bg-brand/5" : "border-line"}`}
                                  />
                                ) : l.snapshot?.days_worked != null ? (
                                  `${l.snapshot.days_worked}/${l.snapshot.working_days}`
                                ) : (
                                  "—"
                                )}
                              </td>
                              {/* Gross pay = the earning components (they split the base salary) plus any benefit allowances. */}
                              <td
                                className="px-3 py-2 text-right"
                                title={[
                                  lineItemsTooltip(l.snapshot?.line_items, "remuneration", selectedRun.currency),
                                  Number(l.allowances_total) > 0 ? `Benefit allowances: ${fmtMoney(l.allowances_total, selectedRun.currency)}` : null,
                                ].filter(Boolean).join("\n") || undefined}
                              >
                                {fmtMoney(l.gross_salary ?? l.gross, selectedRun.currency)}
                              </td>
                              <td
                                className="px-3 py-2 text-right text-red-600"
                                title={[
                                  Number(l.snapshot?.loan_deductions) > 0 ? `Loan repayment: ${fmtMoney(l.snapshot.loan_deductions, selectedRun.currency)}` : null,
                                  lineItemsTooltip(l.snapshot?.line_items, "deduction", selectedRun.currency),
                                ].filter(Boolean).join("\n") || undefined}
                              >
                                {fmtMoney(l.deductions_total ?? l.total_deductions ?? l.deductions, selectedRun.currency)}
                                {Number(l.snapshot?.loan_deductions) > 0 && <span className="ml-1 align-middle text-[9px] font-bold uppercase text-ink-faint">incl. loan</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">{fmtMoney(l.net_salary ?? l.net_pay ?? l.net ?? l.total_net, selectedRun.currency)}</td>
                              <td
                                className="px-3 py-2 text-right text-sky-700"
                                title={lineItemsTooltip(l.snapshot?.line_items, "employer_contribution", selectedRun.currency)}
                              >
                                {l.snapshot?.employer_contributions != null ? fmtMoney(l.snapshot.employer_contributions, selectedRun.currency) : "—"}
                              </td>
                              <td className="px-3 py-2 text-right text-ink-muted">
                                {l.snapshot?.staff_cost != null ? fmtMoney(l.snapshot.staff_cost, selectedRun.currency) : "—"}
                              </td>
                              {customColumns.map((col) => {
                                const owner = col.values?.[0]?.employee_id;
                                const editable = canColUpdate && adjustable && (col.is_global || owner === l.employee_id);
                                return (
                                  <CustomColumnCell
                                    key={col.id}
                                    column={col}
                                    employeeId={l.employee_id}
                                    currency={selectedRun.currency}
                                    editable={editable}
                                    busy={colValueBusyKey === `${col.id}:${l.employee_id}`}
                                    onSave={(amount) => saveColumnValue(col.id, l.employee_id, amount)}
                                  />
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {/* Adjustments */}
                <div className="rounded-xl border border-line">
                  <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">Adjustments</h4>
                      <p className="text-[11px] text-ink-muted">One-off earnings or deductions for this run{adjustable ? "" : " (locked)"}.</p>
                    </div>
                    {canAdjCreate && adjustable && (
                      <button
                        onClick={() => setShowAdjustment(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-sunken"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    )}
                  </div>
                  {runAdjustments.length === 0 ? (
                    <div className="p-5 text-center text-xs text-ink-faint">No adjustments on this run.</div>
                  ) : (
                    <ul className="divide-y divide-line-soft">
                      {runAdjustments.map((a) => {
                        const st = String(a.status || "draft").toLowerCase();
                        return (
                          <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-ink">
                                {staffName(a.employee_id)}
                                <span className={`ml-2 text-xs font-bold ${a.adjustment_type === "deduction" ? "text-red-600" : "text-emerald-600"}`}>
                                  {a.adjustment_type === "deduction" ? "−" : "+"}{fmtMoney(a.amount, selectedRun.currency)}
                                </span>
                              </div>
                              <div className="truncate text-xs text-ink-muted">
                                {a.reason} · <span className="uppercase text-[10px] font-bold tracking-wider">{st.replace(/_/g, " ")}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              {canAdjSubmit && (st === "draft" || st === "created") && (
                                <button
                                  disabled={busy}
                                  onClick={async () => {
                                    setBusy(true);
                                    try {
                                      await payrollService.submitAdjustment(a.id);
                                      toast.success("Adjustment submitted for approval.");
                                      await refreshAfterAction();
                                    } catch (err) {
                                      toast.error(err?.message || "Couldn't submit adjustment.");
                                    } finally { setBusy(false); }
                                  }}
                                  className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted hover:bg-sunken"
                                >
                                  Submit
                                </button>
                              )}
                              {canAdjReview && st.includes("pend") && (
                                <>
                                  <button
                                    disabled={busy}
                                    onClick={() => setApproveModal({
                                      action: { label: "Approve adjustment", exec: (id, aid, c) => payrollService.approveAdjustment(id, aid, c) },
                                      target: "adjustment",
                                      id: a.id,
                                    })}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    disabled={busy}
                                    onClick={() => setApproveModal({
                                      action: { label: "Reject adjustment", exec: (id, aid, c) => payrollService.rejectAdjustment(id, aid, c) },
                                      target: "adjustment",
                                      id: a.id,
                                    })}
                                    className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNewRun && (
          <NewRunModal
            defaultCurrency={config?.currency || "NGN"}
            payGroups={payGroups}
            onClose={() => setShowNewRun(false)}
            onCreated={async (created) => {
              setShowNewRun(false);
              const list = await loadRuns();
              const newId = created?.run?.id || created?.id;
              setSelectedId(newId || list[0]?.id || null);
              toast.success("Payroll preview generated.");
            }}
          />
        )}

        {showLineItems && (
          <LineItemsModal payGrades={payGrades} onClose={() => setShowLineItems(false)} />
        )}

        {showColumnModal && selectedRun && (
          <CustomColumnModal
            run={selectedRun}
            employees={
              runLines.length
                ? runLines.map((l) => ({ id: l.employee_id, name: l.snapshot?.employee_name || staffName(l.employee_id) }))
                : staff.map((s) => ({ id: s.id, name: getEmployeeName(s, s.email) }))
            }
            existingNames={customColumns.map((c) => c.name.toLowerCase())}
            busy={busy}
            onClose={() => setShowColumnModal(false)}
            onSubmit={async (payload) => {
              setBusy(true);
              try {
                await payrollService.createCustomColumn(payload);
                toast.success("Column added.");
                setShowColumnModal(false);
                await refreshAfterAction();
              } catch (err) {
                console.error("[Payroll] Custom column create failed:", err);
                toast.error(err?.message || "Couldn't add the column.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {approveModal && (
          <ApproveModal
            title={approveModal.action.label}
            danger={approveModal.action.danger}
            busy={busy}
            onClose={() => setApproveModal(null)}
            onSubmit={runApproveAction}
          />
        )}

        {showAdjustment && selectedRun && (
          <AdjustmentModal
            run={selectedRun}
            employees={
              runLines.length
                ? runLines.map((l) => ({ id: l.employee_id, name: l.snapshot?.employee_name || staffName(l.employee_id) }))
                : staff.map((s) => ({ id: s.id, name: getEmployeeName(s, s.email) }))
            }
            busy={busy}
            onClose={() => setShowAdjustment(false)}
            onSubmit={async (payload) => {
              setBusy(true);
              try {
                await payrollService.createAdjustment(payload);
                toast.success("Adjustment added.");
                setShowAdjustment(false);
                await refreshAfterAction();
              } catch (err) {
                console.error("[Payroll] Adjustment create failed:", err);
                toast.error(err?.message || "Couldn't add the adjustment.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const inputCls = "w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1 focus:border-brand";
const labelCls = "text-xs font-semibold text-ink-muted uppercase tracking-wider";

// Weekdays (Mon–Fri) in a month — the default "working days in the month",
// same rule the server uses when none is given.
const weekdaysInMonth = (year, month) => {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let n = 0;
  for (let d = 1; d <= days; d += 1) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (dow !== 0 && dow !== 6) n += 1;
  }
  return n;
};

function NewRunModal({ defaultCurrency, payGroups = [], onClose, onCreated }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payGroup, setPayGroup] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [workingDays, setWorkingDays] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const suggestedDays = Number.isInteger(Number(year)) ? weekdaysInMonth(Number(year), Number(month)) : 22;

  const submit = async (e) => {
    e.preventDefault();
    if (!payGroup) { setError("Pick a pay group — payroll is generated per pay group."); return; }
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      setError("Enter a valid year between 2000 and 2100.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const days = workingDays === "" ? undefined : Number(workingDays);
      if (days !== undefined && (!Number.isFinite(days) || days <= 0 || days > 31)) {
        setError("Working days must be between 1 and 31.");
        setSaving(false);
        return;
      }
      const created = await payrollService.preview({
        month: Number(month),
        year: y,
        pay_group: payGroup,
        currency: currency || undefined,
        working_days: days,
      });
      await onCreated(created);
    } catch (err) {
      console.error("[Payroll] Preview failed:", err);
      setError(err?.message || "Couldn't generate the payroll preview.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">Run payroll</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year</label>
              <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Pay group</label>
            {/* Sends the pay group id — employee records reference it as a uuid. */}
            <select value={payGroup} onChange={(e) => setPayGroup(e.target.value)} className={inputCls}>
              <option value="">— Select pay group —</option>
              {payGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {payGroups.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-700">No pay groups yet — create one under Directory → Pay Groups first.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Working days in the month</label>
            <input
              type="number"
              min="1"
              max="31"
              step="0.5"
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              placeholder={`${suggestedDays} (weekdays in ${MONTHS[Number(month) - 1] || "the month"})`}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              Leave blank to use {suggestedDays}. Everyone is paid for all working days; change days worked per person on the preview.
            </p>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              {[...new Set([defaultCurrency, ...CURRENCIES])].filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {saving ? "Generating…" : "Generate preview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApproveModal({ title, danger = false, busy, onClose, onSubmit }) {
  const [comment, setComment] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelCls}>{danger ? "Reason (recommended)" : "Comment (optional)"}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`${inputCls} h-20 py-2 resize-none`}
              placeholder={danger ? "Why is this being rejected? The submitter will see this…" : "Visible in the approval trail…"}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button
              onClick={() => onSubmit(comment.trim() || null)}
              disabled={busy}
              className={`h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-70 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-brand"}`}
            >
              {busy ? "Working…" : danger ? "Reject" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdjustmentModal({ run, employees = [], busy, onClose, onSubmit }) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("earning");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!employeeId) return setError("Pick the employee this adjustment applies to.");
    if (!amount || Number(amount) <= 0) return setError("Enter an amount greater than zero.");
    if (!reason.trim()) return setError("A reason is required — it shows in the approval trail.");
    setError("");
    onSubmit({
      payroll_run_id: run.id,
      employee_id: employeeId,
      adjustment_type: type,
      amount: Number(amount),
      reason: reason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">Add adjustment</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div>
            <label className={labelCls}>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                <option value="earning">Earning (adds)</option>
                <option value="deduction">Deduction (removes)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="50000" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-20 py-2 resize-none`} placeholder="e.g. Overtime for June inventory count" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={busy} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {busy ? "Saving…" : "Add adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// One cell in the run-detail table for a dynamic custom column. Read-only
// display when not editable (locked run, no permission, or — for a column
// peculiar to one employee — a different employee's row); click-to-edit
// inline number input otherwise.
function CustomColumnCell({ column, employeeId, currency, editable, busy, onSave }) {
  const value = (column.values || []).find((v) => v.employee_id === employeeId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!editable) {
    return <td className="px-3 py-2 text-right text-ink-muted">{value ? fmtMoney(value.amount, currency) : "—"}</td>;
  }

  if (editing) {
    return (
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-7 w-24 rounded border border-line px-1.5 text-right text-xs outline-none focus:border-brand"
          />
          <button
            disabled={busy}
            onClick={async () => {
              const amount = Number(draft);
              if (!Number.isFinite(amount) || amount < 0) return;
              await onSave(amount);
              setEditing(false);
            }}
            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button disabled={busy} onClick={() => setEditing(false)} className="text-ink-faint hover:text-ink disabled:opacity-50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    );
  }

  return (
    <td className="px-3 py-2 text-right">
      <button
        onClick={() => { setDraft(value ? String(value.amount) : ""); setEditing(true); }}
        className="text-ink-muted hover:text-brand hover:underline"
      >
        {value ? fmtMoney(value.amount, currency) : "—"}
      </button>
    </td>
  );
}

function CustomColumnModal({ run, employees = [], existingNames = [], busy, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("remuneration");
  const [scope, setScope] = useState("all"); // "all" | "one"
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a column name.");
    if (existingNames.includes(trimmed.toLowerCase())) return setError("A column with this name already exists on this payroll.");
    const isGlobal = scope === "all";
    if (!isGlobal) {
      if (!employeeId) return setError("Pick the staff member this column applies to.");
      if (!amount || Number(amount) <= 0) return setError("Enter an amount greater than zero.");
    }
    setError("");
    onSubmit({
      payroll_run_id: run.id,
      name: trimmed,
      item_type: itemType,
      is_global: isGlobal,
      ...(isGlobal ? {} : { employee_id: employeeId, amount: Number(amount) }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">Add payroll column</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div>
            <label className={labelCls}>Column name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Transport Reimbursement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={itemType} onChange={(e) => setItemType(e.target.value)} className={inputCls}>
                <option value="remuneration">Remuneration (adds)</option>
                <option value="deduction">Deduction (removes)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Applies to</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls}>
                <option value="all">All staff on this payroll</option>
                <option value="one">One specific staff member</option>
              </select>
            </div>
          </div>
          {scope === "all" ? (
            <p className="text-[11px] text-ink-faint">
              The column starts blank for every employee — set individual amounts afterwards directly in the table.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Staff member</label>
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Amount</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="20000" />
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={busy} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {busy ? "Saving…" : "Add column"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LineItemsModal({ payGrades = [], onClose }) {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const canCreate = can("PAYROLL_LINE_ITEM", "create");
  const canUpdate = can("PAYROLL_LINE_ITEM", "update");
  const canDelete = can("PAYROLL_LINE_ITEM", "delete");

  const [payGradeId, setPayGradeId] = useState(payGrades[0]?.id || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null | "new" | item
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState(false);

  const itemName = (id) => items.find((i) => i.id === id)?.name || "another item";

  const load = async (gradeId) => {
    if (!gradeId) { setItems([]); return; }
    setLoading(true);
    try {
      setItems(await payrollService.listLineItems(gradeId));
    } catch (err) {
      console.error("[Payroll] Failed to load line items:", err);
      toast.error(err?.message || "Couldn't load line items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(payGradeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payGradeId]);

  // Remuneration items split the base salary, so their percentages must not
  // exceed 100% (payroll refuses to run otherwise). Work out each active
  // item's share of base: % of base directly, % of another item via that
  // item's share, sums via their parts. Fixed amounts can't be expressed as
  // a share without a salary, so they're totalled separately.
  const split = useMemo(() => {
    const active = items.filter((i) => i.is_active !== false);
    const byId = new Map(active.map((i) => [i.id, i]));
    const memo = new Map();
    const share = (item, seen = new Set()) => {
      if (memo.has(item.id)) return memo.get(item.id);
      if (seen.has(item.id)) return null;
      seen.add(item.id);
      const v = Number(item.value) || 0;
      let r = null;
      if (item.calculation_method === "percentage") r = v;
      else if (item.calculation_method === "percentage_of") {
        const base = byId.get(item.base_line_item_id);
        const b = base ? share(base, seen) : null;
        r = b == null ? null : (v / 100) * b;
      } else if (item.calculation_method === "sum_of") {
        const parts = (item.component_line_item_ids || []).map((id) => byId.get(id));
        if (parts.length && parts.every(Boolean)) {
          const vals = parts.map((p) => share(p, seen));
          r = vals.every((x) => x != null) ? vals.reduce((a, b) => a + b, 0) : null;
        }
      }
      memo.set(item.id, r);
      return r;
    };
    const isSubtotal = (i) =>
      i.calculation_method === "sum_of" &&
      (i.component_line_item_ids || []).length > 0 &&
      (i.component_line_item_ids || []).every((id) => byId.get(id)?.item_type === i.item_type);
    const rows = active
      .filter((i) => i.item_type === "remuneration" && !isSubtotal(i))
      .map((i) => ({ id: i.id, name: i.name, method: i.calculation_method, pct: share(i), fixed: i.calculation_method === "fixed" ? Number(i.value) || 0 : 0 }));
    const pctTotal = rows.reduce((a, r) => a + (r.pct || 0), 0);
    const fixedTotal = rows.reduce((a, r) => a + r.fixed, 0);
    return { rows, pctTotal: Math.round(pctTotal * 100) / 100, fixedTotal };
  }, [items]);

  const describeCalc = (item) => {
    if (item.calculation_method === "paye") return "PAYE — Nigeria Tax Act 2025 bands";
    if (item.calculation_method === "percentage") return `${Number(item.value).toLocaleString()}% of base`;
    if (item.calculation_method === "percentage_of") {
      return `${Number(item.value).toLocaleString()}% of ${itemName(item.base_line_item_id)}`;
    }
    if (item.calculation_method === "sum_of") {
      const parts = (item.component_line_item_ids || []).map(itemName);
      return `Sum of ${parts.join(" + ") || "—"}`;
    }
    return `₦${Number(item.value).toLocaleString()} fixed`;
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: "Delete line item",
      message: `Remove "${item.name}"? Future payroll runs will no longer include it for staff on this grade.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await payrollService.deleteLineItem(item.id);
      toast.success("Line item deleted.");
      await load(payGradeId);
    } catch (err) {
      toast.error(err?.message || "Couldn't delete the line item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Payroll line items</h3>
            <p className="text-xs text-ink-muted">Recurring remuneration/deduction rules, categorized by pay grade — applied automatically to every staff member on that grade, in any pay group. Remuneration items are the components a staff member's base salary is split into (any part they don't claim is shown as "Balance of base salary"), so they never add to it; deductions come off gross pay.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-[220px]">
            <label className={labelCls}>Pay grade</label>
            <select value={payGradeId} onChange={(e) => { setEditing(null); setPayGradeId(e.target.value); }} className={inputCls}>
              <option value="">— Select pay grade —</option>
              {payGrades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {canCreate && payGradeId && (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-sunken"
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </button>
          )}
          {canCreate && payGradeId && (
            <button
              onClick={() => setBulk(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-sunken"
            >
              <Plus className="h-3.5 w-3.5" /> Bulk upload
            </button>
          )}
        </div>

        {editing && (
          <LineItemForm
            payGrades={payGrades}
            existingItems={items}
            defaultPayGradeId={payGradeId}
            item={editing === "new" ? null : editing}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSubmit={async (payload) => {
              setBusy(true);
              try {
                if (editing === "new") {
                  await payrollService.createLineItem(payload);
                  toast.success("Line item added.");
                } else {
                  await payrollService.updateLineItem(editing.id, payload);
                  toast.success("Line item updated.");
                }
                setEditing(null);
                await load(payGradeId);
              } catch (err) {
                toast.error(err?.message || "Couldn't save the line item.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          {loading ? (
            <div className="p-6 text-center text-xs text-ink-faint">Loading line items…</div>
          ) : !payGradeId ? (
            <div className="p-6 text-center text-xs text-ink-faint">Pick a pay grade to see its configured line items.</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-faint">No line items configured for this pay grade yet.</div>
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-sunken/60 text-[10px] uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-left font-semibold">Calculation</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-line-soft">
                    <td className="px-3 py-2 font-medium text-ink-2">{item.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.item_type === "deduction"
                            ? "bg-red-50 text-red-700"
                            : item.item_type === "employer_contribution"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.item_type === "employer_contribution" ? "employer cost" : item.item_type === "remuneration" ? "earning" : "deduction"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      {describeCalc(item)}
                      {item.is_tax_relief && (
                        <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">tax relief</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-sunken text-ink-muted"}`}>
                        {item.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        {canUpdate && (
                          <button onClick={() => setEditing(item)} className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink-muted hover:bg-sunken">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button disabled={busy} onClick={() => handleDelete(item)} className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {payGradeId && !loading && split.rows.length > 0 && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 text-xs ${
              split.pctTotal > 100.005 ? "border-red-200 bg-red-50 text-red-800" : "border-line-soft bg-sunken/40 text-ink-muted"
            }`}
            role={split.pctTotal > 100.005 ? "alert" : undefined}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">How base salary is split on this grade</span>
              <span className={`font-bold tabular-nums ${split.pctTotal > 100.005 ? "text-red-700" : "text-ink"}`}>
                {split.pctTotal}% of base{split.fixedTotal ? ` + ₦${split.fixedTotal.toLocaleString()} fixed` : ""}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {split.rows.map((r) => (
                <span key={r.id} className="rounded-full bg-card px-2 py-0.5 ring-1 ring-line-soft">
                  {r.name}: {r.method === "fixed" ? `₦${r.fixed.toLocaleString()}` : r.pct == null ? "—" : `${Math.round(r.pct * 100) / 100}%`}
                </span>
              ))}
            </div>
            <p className="mt-1.5">
              {split.pctTotal > 100.005
                ? `These items add up to more than the whole base salary, so payroll will refuse to run for anyone on this grade. Reduce or remove items worth ${Math.round((split.pctTotal - 100) * 100) / 100}% of base.`
                : split.pctTotal < 99.995
                  ? `The remaining ${Math.round((100 - split.pctTotal) * 100) / 100}% (less any fixed amounts) is paid as "Balance of base salary".`
                  : "The items cover exactly 100% of base salary."}
            </p>
          </div>
        )}
      </div>
      {bulk && (
        <BulkUploadModal
          payGrades={payGrades}
          defaultPayGradeId={payGradeId}
          onClose={() => setBulk(false)}
          onUploaded={async (opts) => {
            // Partial failures keep the dialog open so the errors stay visible.
            if (!opts?.keepOpen) setBulk(false);
            await load(payGradeId);
          }}
        />
      )}
    </div>
  );
}

// The organization's standard salary structure (the Dash MFB payroll
// schedule), as a ready-to-upload starting point for any pay grade.
const LINE_ITEM_TEMPLATE_CSV = [
  "name,item_type,calculation_method,value,base_line_item,components,is_tax_relief,description",
  "Basic,earning,percentage,15,,,,",
  "Housing,earning,percentage,10,,,,",
  "Transport/Passage,earning,percentage,10,,,,",
  "Meal Allowance,earning,percentage,15,,,,",
  "Utility,earning,percentage,20,,,,",
  "Leave Allowance,earning,percentage,30,,,,",
  "BHT,earning,sum_of,,,Basic|Housing|Transport/Passage,,Basic + Housing + Transport (pension base)",
  "Pension Contribution - DashMFB,employer_cost,percentage_of,10,BHT,,,10% of BHT",
  "NSITF,employer_cost,percentage,1,,,,",
  "ITF,employer_cost,percentage,1,,,,",
  "Pension Contribution - Staff,deduction,percentage_of,8,BHT,,true,8% of BHT",
  "National Housing Fund,deduction,percentage_of,2.5,Basic,,true,2.5% of Basic",
  "PAYE,deduction,paye,,,,,Nigeria Tax Act 2025",
].join("\n");

const ITEM_TYPE_ALIASES = {
  remuneration: "remuneration", earning: "remuneration", earnings: "remuneration", allowance: "remuneration",
  deduction: "deduction",
  employer_contribution: "employer_contribution", employer_cost: "employer_contribution", "employer cost": "employer_contribution", employer: "employer_contribution",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const truthy = (v) => /^(true|yes|y|1)$/i.test(String(v || "").trim());

function BulkUploadModal({ payGrades = [], defaultPayGradeId, onClose, onUploaded }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [payGradeId, setPayGradeId] = useState(defaultPayGradeId || "");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([LINE_ITEM_TEMPLATE_CSV], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll-line-items-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { rows: [], errors: [] };
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = [];
    const errs = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const obj = {};
      for (let j = 0; j < header.length; j++) obj[header[j]] = cols[j] ?? "";
      if (!obj.name) { errs.push(`Line ${i + 1}: missing name`); continue; }
      const type = ITEM_TYPE_ALIASES[String(obj.item_type || "").trim().toLowerCase()];
      if (!type) { errs.push(`Line ${i + 1}: item_type must be earning, deduction or employer_cost`); continue; }
      rows.push({ line: i + 1, obj, type });
    }
    return { rows, errors: errs };
  };

  const submit = async () => {
    if (!payGradeId) return toast.error("Pick a pay grade first.");
    if (!file) return toast.error("Select a CSV file to upload.");
    setBusy(true);
    try {
      const { rows, errors: parseErrors } = parseCSV(await file.text());
      if (parseErrors.length) { setErrors(parseErrors); return; }
      if (rows.length === 0) { toast.error("No items found in the file."); return; }

      // "percentage of" / "sum of" can name the item they build on — one
      // already on this pay grade or one earlier in this same file.
      const existing = await payrollService.listLineItems(payGradeId).catch(() => []);
      const idByName = new Map((Array.isArray(existing) ? existing : []).map((i) => [i.name.trim().toLowerCase(), i.id]));
      const resolve = (ref) => {
        const r = String(ref || "").trim();
        if (!r) return null;
        return UUID_RE.test(r) ? r : idByName.get(r.toLowerCase()) || null;
      };

      const failures = [];
      for (const { line, obj, type } of rows) {
        try {
          const method = String(obj.calculation_method || "fixed").trim().toLowerCase();
          const baseRef = obj.base_line_item || obj.base_line_item_id;
          const compRefs = String(obj.components || obj.component_line_item_ids || "")
            .split("|")
            .map((x) => x.trim())
            .filter(Boolean);
          const baseId = method === "percentage_of" ? resolve(baseRef) : null;
          if (method === "percentage_of" && !baseId) throw new Error(`"${baseRef}" isn't a line item on this pay grade (list it earlier in the file)`);
          const compIds = method === "sum_of" ? compRefs.map(resolve) : [];
          if (method === "sum_of" && compIds.some((x) => !x)) throw new Error(`one of "${compRefs.join(" | ")}" isn't a line item on this pay grade`);

          const created = await payrollService.createLineItem({
            name: obj.name,
            pay_grade_id: payGradeId,
            item_type: type,
            calculation_method: method,
            value: obj.value ? Number(obj.value) : 0,
            base_line_item_id: baseId,
            component_line_item_ids: method === "sum_of" ? compIds : null,
            is_tax_relief: type === "deduction" && method !== "paye" && truthy(obj.is_tax_relief),
            description: obj.description || "",
            is_active: String(obj.is_active || "").toLowerCase() === "false" ? false : true,
          });
          if (created?.id) idByName.set(obj.name.trim().toLowerCase(), created.id);
        } catch (err) {
          failures.push(`Line ${line} (${obj.name}): ${err?.error?.message || err?.message || String(err)}`);
        }
      }
      if (failures.length) {
        setErrors(failures);
        toast.error(`Uploaded with ${failures.length} error(s).`);
        onUploaded?.({ keepOpen: true });
      } else {
        toast.success(`${rows.length} line item${rows.length === 1 ? "" : "s"} added.`);
        onUploaded();
      }
    } catch (err) {
      toast.error(err?.message || "Bulk upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">Bulk upload line items</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelCls}>Pay grade</label>
            <select value={payGradeId} onChange={(e) => setPayGradeId(e.target.value)} className={inputCls}>
              <option value="">— Select pay grade —</option>
              {payGrades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="rounded-xl border border-line-soft bg-sunken/40 p-3 text-xs text-ink-muted">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">Start from the standard salary structure</span>
              <button type="button" onClick={downloadTemplate} className="rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-brand hover:bg-sunken">
                Download template
              </button>
            </div>
            <p className="mt-1">
              Basic, Housing, Transport, Meal, Utility and Leave (100% of gross); employer pension, NSITF and ITF; staff
              pension, NHF and PAYE. Adjust the percentages, then upload it for each pay grade.
            </p>
          </div>
          <div>
            <label className={labelCls}>CSV file</label>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="mt-1 text-xs text-ink-faint">
              Columns: name, item_type (earning / deduction / employer_cost), calculation_method (fixed / percentage /
              percentage_of / sum_of / paye), value, base_line_item (a name), components (names separated by |),
              is_tax_relief (true/false), description. List an item before anything that builds on it.
            </p>
          </div>
          {errors.length > 0 && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <strong>These rows weren't added:</strong>
              <ul className="mt-2 list-disc list-inside">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Close</button>
            <button type="button" disabled={busy} onClick={submit} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">{busy ? "Uploading…" : "Upload"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItemForm({ payGrades = [], existingItems = [], defaultPayGradeId, item, busy, onCancel, onSubmit }) {
  const [name, setName] = useState(item?.name || "");
  const [payGradeId, setPayGradeId] = useState(item?.pay_grade_id || defaultPayGradeId || "");
  const [itemType, setItemType] = useState(item?.item_type || "remuneration");
  const [calcMethod, setCalcMethod] = useState(item?.calculation_method || "fixed");
  const [value, setValue] = useState(item?.value != null ? String(item.value) : "");
  const [baseLineItemId, setBaseLineItemId] = useState(item?.base_line_item_id || "");
  const [componentIds, setComponentIds] = useState(item?.component_line_item_ids || []);
  const [description, setDescription] = useState(item?.description || "");
  const [isActive, setIsActive] = useState(item?.is_active !== false);
  const [isTaxRelief, setIsTaxRelief] = useState(!!item?.is_tax_relief);
  const [error, setError] = useState("");

  // Other items on this pay grade an item can be derived from — never itself,
  // and never PAYE (it's computed last, from everything else).
  const referenceable = existingItems.filter((i) => i.id !== item?.id && i.calculation_method !== "paye");
  const isDerived = calcMethod === "percentage_of" || calcMethod === "sum_of" || calcMethod === "paye";
  const hasOtherPaye = existingItems.some((i) => i.calculation_method === "paye" && i.id !== item?.id);

  const toggleComponent = (id) => {
    setComponentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required.");
    if (!payGradeId) return setError("Pick a pay grade.");

    let numeric = 0;
    if (calcMethod === "fixed" || calcMethod === "percentage" || calcMethod === "percentage_of") {
      numeric = Number(value);
      if (!value || !Number.isFinite(numeric) || numeric <= 0) return setError("Enter a value greater than zero.");
      if ((calcMethod === "percentage" || calcMethod === "percentage_of") && numeric > 100) {
        return setError("Percentage must be 100 or less.");
      }
    }
    if (calcMethod === "percentage_of" && !baseLineItemId) {
      return setError("Pick the line item this is a percentage of.");
    }
    if (calcMethod === "sum_of" && componentIds.length < 2) {
      return setError("Pick at least two line items to sum.");
    }

    if (calcMethod === "paye" && itemType !== "deduction") {
      return setError("PAYE can only be a deduction.");
    }

    setError("");
    onSubmit({
      name: name.trim(),
      pay_grade_id: payGradeId,
      item_type: itemType,
      calculation_method: calcMethod,
      is_tax_relief: itemType === "deduction" && calcMethod !== "paye" ? isTaxRelief : false,
      value: numeric,
      base_line_item_id: calcMethod === "percentage_of" ? baseLineItemId : null,
      component_line_item_ids: calcMethod === "sum_of" ? componentIds : null,
      description: description.trim() || null,
      is_active: isActive,
    });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-line p-4">
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Housing Allowance" />
        </div>
        <div>
          <label className={labelCls}>Pay grade</label>
          <select value={payGradeId} onChange={(e) => setPayGradeId(e.target.value)} className={inputCls}>
            <option value="">— Select —</option>
            {payGrades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <select
            value={itemType}
            onChange={(e) => {
              setItemType(e.target.value);
              if (e.target.value !== "deduction" && calcMethod === "paye") setCalcMethod("percentage");
            }}
            className={inputCls}
          >
            <option value="remuneration">Earning — part of gross pay</option>
            <option value="deduction">Deduction — taken off the employee's pay</option>
            <option value="employer_contribution">Employer cost — paid by the company (e.g. employer pension, NSITF, ITF)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Calculation</label>
          <select value={calcMethod} onChange={(e) => setCalcMethod(e.target.value)} className={inputCls}>
            <option value="fixed">Fixed amount</option>
            <option value="percentage">Percentage of base salary</option>
            <option value="percentage_of">Percentage of another line item</option>
            <option value="sum_of">Sum of other line items</option>
            {itemType === "deduction" && (!hasOtherPaye || calcMethod === "paye") && (
              <option value="paye">PAYE — calculated automatically</option>
            )}
          </select>
        </div>
      </div>

      {!isDerived && (
        <div>
          <label className={labelCls}>{calcMethod === "percentage" ? "Percentage (%)" : "Amount (₦)"}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
            placeholder={calcMethod === "percentage" ? "10" : "50000"}
          />
        </div>
      )}

      {calcMethod === "percentage_of" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Percentage (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} placeholder="50" />
          </div>
          <div>
            <label className={labelCls}>Of line item</label>
            <select value={baseLineItemId} onChange={(e) => setBaseLineItemId(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {referenceable.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {calcMethod === "sum_of" && (
        <div>
          <label className={labelCls}>Sum of (pick two or more)</label>
          {referenceable.length === 0 ? (
            <p className="mt-1 text-xs text-ink-faint">No other line items on this pay grade yet — add at least two before creating a sum.</p>
          ) : (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-line p-2 space-y-1">
              {referenceable.map((i) => (
                <label key={i.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-ink-2 hover:bg-sunken">
                  <input type="checkbox" checked={componentIds.includes(i.id)} onChange={() => toggleComponent(i.id)} />
                  {i.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {calcMethod === "paye" && (
        <p className="rounded-lg bg-sunken/60 px-3 py-2 text-xs text-ink-muted">
          PAYE is worked out for each employee under the Nigeria Tax Act 2025 bands: their monthly gross pay, less every
          deduction marked as a tax relief, is annualised, taxed (0% to ₦800k, then 15%, 18%, 21%, 23% and 25%), and
          divided by 12.
        </p>
      )}

      {itemType === "deduction" && calcMethod !== "paye" && (
        <label className="flex items-start gap-2 text-xs font-semibold text-ink-muted">
          <input type="checkbox" className="mt-0.5" checked={isTaxRelief} onChange={(e) => setIsTaxRelief(e.target.checked)} />
          <span>
            Tax relief — taken out of taxable income before PAYE
            <span className="block font-normal text-ink-faint">Tick for the staff pension contribution, National Housing Fund and NHIS.</span>
          </span>
        </label>
      )}

      <div>
        <label className={labelCls}>Description (optional)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} h-16 py-2 resize-none`} />
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="h-9 border border-line rounded-xl px-3 text-xs font-semibold text-ink-muted">Cancel</button>
        <button type="submit" disabled={busy} className="h-9 bg-brand text-white rounded-xl px-3 text-xs font-semibold disabled:opacity-70">
          {busy ? "Saving…" : item ? "Save changes" : "Add item"}
        </button>
      </div>
    </form>
  );
}

export default PayrollPage;
