import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Banknote,
  BellRing,
  Check,
  HandCoins,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { loanService } from "../../services/loanService";
import { findApprovalRequestId } from "../../services/payrollService";
import { setupService } from "../../services/setupService";
import { orgService } from "../../services/orgService";
import { usePermissions } from "../../context/PermissionContext";
import { useConfig } from "../../context/ConfigContext";
import { useAuth } from "../../context/AuthContext";
import { isDesignatedApprover } from "../../utils/approvers";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { resolvePersonName, getInitials } from "../../utils/employee";
import { fmtMoney } from "../../utils/payroll";
import { TabPills } from "../../components/ui/TabPills";


const STATUS_META = {
  draft: { label: "Draft", cls: "bg-sunken text-ink-muted", step: 0 },
  pending_approval: { label: "Pending approval", cls: "bg-amber-50 text-amber-700", step: 1 },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700", step: 2 },
  active: { label: "Active", cls: "bg-sky-50 text-sky-700", step: 3 },
  repaid: { label: "Repaid", cls: "bg-emerald-600 text-white", step: 4 },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700", step: -1 },
  cancelled: { label: "Cancelled", cls: "bg-sunken text-ink-muted", step: -1 },
  defaulted: { label: "Defaulted", cls: "bg-red-50 text-red-700", step: -1 },
};

const statusMeta = (status) =>
  STATUS_META[status] || { label: status || "Unknown", cls: "bg-sunken text-ink-muted", step: 0 };

const MILESTONES = [
  { label: "Requested", at: 1 },
  { label: "Approved", at: 2 },
  { label: "Active", at: 3 },
  { label: "Repaid", at: 4 },
];

const STATUS_TABS = [
  { key: "pending", label: "Pending", statuses: ["draft", "pending_approval"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "active", label: "Active", statuses: ["active"] },
  { key: "repaid", label: "Repaid", statuses: ["repaid"] },
  { key: "closed", label: "Closed", statuses: ["rejected", "cancelled", "defaulted"] },
  { key: "all", label: "All" },
];

const REPAYMENT_METHODS = [
  {
    key: "payroll_deduction",
    label: "Payroll deduction",
    hint: "Installments are captured automatically when a payroll distribution is approved.",
  },
  {
    key: "external",
    label: "External (manual)",
    hint: "Admins record each repayment by hand — bank transfer, cash, and so on.",
  },
];

const SCHEDULE_CHIP = {
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  upcoming: "bg-sunken text-ink-muted",
};

const statusOf = (l) => String(l.status || "").toLowerCase();

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
const outstandingOf = (l) =>
  Math.max(0, Number(l.total_repayable || 0) - Number(l.amount_repaid || 0));

const inputCls = "w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1 focus:border-brand";
const labelCls = "text-xs font-semibold text-ink-muted uppercase tracking-wider";

const LoanAdminPage = () => {
  const { can, isAdmin } = usePermissions();
  const { user } = useAuth();
  const { config } = useConfig();
  const toast = useToast();
  const confirm = useConfirm();

  const currency = config?.currency || "NGN";

  const [loans, setLoans] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [workflows, setWorkflows] = useState(null); // null = unknown → approve buttons stay hidden for non-admins
  const [repaymentConfig, setRepaymentConfig] = useState(null); // null = unknown, [] = not configured yet
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detailState, setDetailState] = useState({ forId: null, loan: null, schedule: null, repayments: [] });

  const [approveModal, setApproveModal] = useState(null); // { danger, label }
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [typeModal, setTypeModal] = useState(null); // { loanType: null | existing }
  const [busy, setBusy] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const canAdminister = isAdmin;
  const canReview =
    can(RESOURCE_CODES.LOANS, "review") &&
    isDesignatedApprover(workflows, "LOAN_REQUEST", user, isAdmin);

  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const detail = selectedId && detailState.forId === selectedId ? detailState : null;
  const detailLoading = !!selectedId && detailState.forId !== selectedId;
  const selectedLoan = useMemo(
    () => detail?.loan || loans.find((l) => l.id === selectedId) || null,
    [detail, loans, selectedId]
  );

  const loadLoans = async () => {
    try {
      // /all is admin-only; a non-admin reviewer falls back to their own list
      // rather than an empty page.
      const list = await loanService.listAll().catch(() => loanService.listMine());
      setLoans(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("[Loans] Failed to load loans:", err);
      toast.error(err?.message || "Couldn't load loan requests.");
    }
  };

  const loadLoanTypes = async () => {
    try {
      const types = await loanService.listLoanTypes();
      setLoanTypes(Array.isArray(types) ? types : []);
    } catch (err) {
      console.error("[Loans] Failed to load loan types:", err);
    }
  };

  const fetchDetail = async (id) => {
    const [loan, schedule, repayments] = await Promise.all([
      loanService.get(id).catch(() => null),
      loanService.getSchedule(id).catch(() => null),
      loanService.listRepayments(id).catch(() => []),
    ]);
    return { forId: id, loan, schedule, repayments: Array.isArray(repayments) ? repayments : [] };
  };

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const [loanList, types, cfg, flows, users] = await Promise.all([
          loanService.listAll().catch(() => loanService.listMine().catch(() => [])),
          loanService.listLoanTypes().catch(() => []),
          loanService.getRepaymentConfig().catch(() => null),
          setupService.getWorkflows().catch(() => null),
          // The users list is admin-gated — don't even ask without the grant.
          can(RESOURCE_CODES.EMPLOYEES, "read")
            ? orgService.listAllUsers().catch(() => [])
            : Promise.resolve([]),
        ]);
        if (stale) return;
        setLoans(Array.isArray(loanList) ? loanList : []);
        setLoanTypes(Array.isArray(types) ? types : []);
        setRepaymentConfig(Array.isArray(cfg) ? cfg : null);
        setWorkflows(Array.isArray(flows) ? flows : null);
        setStaff(Array.isArray(users) ? users : []);
      } catch (err) {
        console.error("[Loans] Load failed:", err);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => { stale = true; };

  }, []);


  useEffect(() => {
    if (!selectedId) return;
    let stale = false;
    (async () => {
      const data = await fetchDetail(selectedId);
      if (!stale) setDetailState(data);
    })();
    return () => { stale = true; };
  }, [selectedId]);

  const refreshAfterAction = async () => {
  
    const loanId = selectedIdRef.current;
    await loadLoans();
    if (loanId && selectedIdRef.current === loanId) {
      try {
        const data = await fetchDetail(loanId);
        if (selectedIdRef.current === loanId) setDetailState(data);
      } catch { /* keep old detail */ }
    }
  };

  const employeeName = (l) => resolvePersonName(l, staff, "Employee");
  const typeName = (l) =>
    loanTypes.find((t) => t.id === l.loan_type_id)?.name || l.loan_type?.name || "Loan";

  const enabledMethods = useMemo(
    () => (repaymentConfig || []).filter((c) => c.is_active).map((c) => c.repayment_method),
    [repaymentConfig]
  );
  const configEmpty = Array.isArray(repaymentConfig) && enabledMethods.length === 0;

  const counts = useMemo(() => {
    const pending = loans.filter((l) => statusOf(l) === "pending_approval").length;
    const active = loans.filter((l) => statusOf(l) === "active").length;
    const outstanding = loans
      .filter((l) => ["approved", "active"].includes(statusOf(l)))
      .reduce((sum, l) => sum + outstandingOf(l), 0);
    return { pending, active, outstanding };
  }, [loans]);

  const visible = useMemo(() => {
    let list = loans;
    const tabDef = STATUS_TABS.find((t) => t.key === tab);
    if (tabDef?.statuses) list = list.filter((l) => tabDef.statuses.includes(statusOf(l)));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((l) =>
        [employeeName(l), typeName(l), l.reason || ""].join(" ").toLowerCase().includes(s)
      );
    }
    return list;

  }, [loans, tab, q, staff, loanTypes]);

  const patchLocal = (id, changes) =>
    setLoans((list) => list.map((l) => (l.id === id ? { ...l, ...changes } : l)));

  const runApproveAction = async (comment) => {
    const { danger, label } = approveModal;
    const loan = detail?.loan || selectedLoan;

    const approvalRequestId = findApprovalRequestId(loan);
    if (!approvalRequestId) {
      toast.error("This loan has no approval request id — it may predate the approval workflow. Re-fetch and try again.");
      return;
    }
    setBusy(true);
    try {
      await (danger
        ? loanService.reject(loan.id, approvalRequestId, comment)
        : loanService.approve(loan.id, approvalRequestId, comment));
      setApproveModal(null);

      let refreshed = null;
      try { refreshed = await loanService.get(loan.id); } catch { /* fall through */ }
      if (refreshed) patchLocal(loan.id, refreshed);
      const status = String(refreshed?.status || "").toLowerCase();
      if (status === "pending_approval") {
        toast.success(`${danger ? "Rejection" : "Approval"} recorded — awaiting the remaining approval steps.`);
      } else {
        toast.success(`${label} — done.`);
      }
      await refreshAfterAction();
    } catch (err) {
      console.error("[Loans] Approval action failed:", err);
      toast.error(err?.message || `${label} failed.`);
    } finally {
      setBusy(false);
    }
  };

  const remind = async (loan) => {
    setBusy(true);
    try {
      await loanService.remind(loan.id);
      toast.success("Reminder sent to the approvers.");
      await refreshAfterAction();
    } catch (err) {
      console.error("[Loans] Reminder failed:", err);
      toast.error(err?.message || "Couldn't send the reminder.");
    } finally {
      setBusy(false);
    }
  };

  const assignMethod = async (method) => {
    setBusy(true);
    try {
      await loanService.setRepaymentMethod(selectedLoan.id, method);
      toast.success("Repayment method updated.");
      await refreshAfterAction();
    } catch (err) {
      console.error("[Loans] Repayment method update failed:", err);
      toast.error(err?.message || "Couldn't set the repayment method.");
    } finally {
      setBusy(false);
    }
  };

  const submitRepayment = async (payload) => {
    setBusy(true);
    try {
      await loanService.recordRepayment(selectedLoan.id, payload);
      toast.success("Repayment recorded.");
      setShowRepayModal(false);
      // The endpoint returns only the repayment row — balances and any
      // approved→active/repaid transition come from the re-fetch.
      await refreshAfterAction();
    } catch (err) {
      console.error("[Loans] Record repayment failed:", err);
      toast.error(err?.message || "Couldn't record the repayment.");
    } finally {
      setBusy(false);
    }
  };

  const toggleMethod = async (methodKey) => {
    const isActive = (k) => (repaymentConfig || []).some((c) => c.repayment_method === k && c.is_active);
    // The PUT replaces the org config — always send BOTH methods' states.
    const methods = REPAYMENT_METHODS.map((m) => ({
      method: m.key,
      is_active: m.key === methodKey ? !isActive(m.key) : isActive(m.key),
    }));
    setSavingConfig(true);
    try {
      const updated = await loanService.setRepaymentConfig(methods);
      if (Array.isArray(updated) && updated.length) {
        setRepaymentConfig(updated);
      } else {
        const cfg = await loanService.getRepaymentConfig().catch(() => null);
        setRepaymentConfig(Array.isArray(cfg) ? cfg : null);
      }
      toast.success("Repayment methods updated.");
    } catch (err) {
      console.error("[Loans] Repayment config update failed:", err);
      toast.error(err?.message || "Couldn't update the repayment configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const saveLoanType = async (payload, id) => {
    setBusy(true);
    try {
      if (id) await loanService.updateLoanType(id, payload);
      else await loanService.createLoanType(payload);
      toast.success(id ? "Loan product updated." : "Loan product created.");
      setTypeModal(null);
      await loadLoanTypes();
    } catch (err) {
      console.error("[Loans] Loan product save failed:", err);
      toast.error(err?.message || "Couldn't save the loan product.");
    } finally {
      setBusy(false);
    }
  };

  const toggleLoanTypeStatus = async (t) => {
    const next = t.status === "active" ? "inactive" : "active";
    setBusy(true);
    try {
      await loanService.updateLoanType(t.id, { status: next });
      toast.success(next === "active" ? "Loan product reactivated." : "Loan product deactivated.");
      await loadLoanTypes();
    } catch (err) {
      console.error("[Loans] Loan product status change failed:", err);
      toast.error(err?.message || "Couldn't change the product status.");
    } finally {
      setBusy(false);
    }
  };

  const removeLoanType = async (t) => {
    const ok = await confirm({
      title: "Delete this loan product?",
      message: `"${t.name}" will be removed permanently. Prefer deactivating — existing loans reference this product. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await loanService.deleteLoanType(t.id);
      toast.success("Loan product deleted.");
      await loadLoanTypes();
    } catch (err) {
      console.error("[Loans] Loan product delete failed:", err);
      toast.error(err?.message || "Couldn't delete the loan product.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Administration</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Loans</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every staff loan in the organization — review requests, assign repayment methods, and track balances.
          </p>
        </div>
        {canAdminister && (
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm ${
              showSettings ? "border-brand bg-brand/5 text-brand" : "border-line bg-card text-ink-muted hover:bg-sunken"
            }`}
          >
            <Settings className="h-4 w-4" /> Loan settings
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Pending approvals", counts.pending, counts.pending > 0],
          ["Active loans", counts.active, false],
          ["Total outstanding", fmtMoney(counts.outstanding, currency), false],
        ].map(([label, value, attention]) => (
          <div key={label} className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
            <div className={`text-2xl font-bold tracking-tight ${attention ? "text-amber-600" : "text-ink"}`}>{value}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
          </div>
        ))}
      </div>

      {/* Repayment methods must be enabled before any loan can be assigned one. */}
      {canAdminister && configEmpty && !showSettings && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2.5 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              No repayment methods are enabled yet — approved loans can't be assigned a repayment method until you enable one.
            </span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Configure methods
          </button>
        </div>
      )}

      {canAdminister && showSettings && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Repayment method configuration */}
          <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-ink">Repayment methods</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Org-wide switchboard. A per-loan method can only be assigned once it's enabled here.
            </p>
            <div className="mt-4 space-y-3">
              {REPAYMENT_METHODS.map((m) => {
                const on = enabledMethods.includes(m.key);
                return (
                  <div key={m.key} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">{m.label}</div>
                      <div className="text-[11px] text-ink-muted">{m.hint}</div>
                    </div>
                    <button
                      onClick={() => toggleMethod(m.key)}
                      disabled={savingConfig || repaymentConfig === null}
                      role="switch"
                      aria-checked={on}
                      aria-label={`${m.label} ${on ? "enabled" : "disabled"}`}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                        on ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          on ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            {repaymentConfig === null && (
              <p className="mt-3 text-[11px] text-red-600">
                The repayment configuration couldn't be loaded — reload the page before toggling.
              </p>
            )}
          </div>

          {/* Loan products */}
          <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Loan products</h3>
                <p className="mt-1 text-xs text-ink-muted">The catalog employees request against.</p>
              </div>
              <button
                onClick={() => setTypeModal({ loanType: null })}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-sunken"
              >
                <Plus className="h-3.5 w-3.5" /> New product
              </button>
            </div>
            {loanTypes.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line p-5 text-center text-xs text-ink-faint">
                No loan products yet — employees can't request loans until one is active.
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line-soft rounded-xl border border-line">
                {loanTypes.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{t.name}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            t.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-sunken text-ink-muted"
                          }`}
                        >
                          {t.status || "active"}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {Number(t.interest_per_annum)}% / yr · up to {t.repayment_period_months} months
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        disabled={busy}
                        onClick={() => setTypeModal({ loanType: t })}
                        title="Edit product"
                        className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-brand"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => toggleLoanTypeStatus(t)}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted hover:bg-sunken"
                      >
                        {t.status === "active" ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => removeLoanType(t)}
                        title="Delete product"
                        className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Loans list */}
      <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-line-soft p-4">
          <TabPills layoutId="loan-tab" active={tab} onChange={setTab} tabs={STATUS_TABS} />
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by employee, product, or reason…"
              className="w-full bg-transparent outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading loan requests…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <HandCoins className="mx-auto h-12 w-12 text-ink-ghost" />
            <h3 className="mt-4 text-sm font-semibold text-ink">No {tab === "all" ? "" : tab + " "}loans</h3>
            <p className="mt-1 text-xs text-ink-muted">Loan requests submitted from the self-service portal appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Product</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Installment</th>
                  <th className="px-4 py-3 text-left font-semibold">Tenure</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Requested</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const m = statusMeta(statusOf(l));
                  const name = employeeName(l);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      className={`cursor-pointer border-t border-line-soft transition-colors hover:bg-sunken/40 ${
                        selectedId === l.id ? "bg-brand/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-[10px] font-bold text-white">
                            {getInitials(name)}
                          </div>
                          <span className="font-semibold text-ink">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-2">{typeName(l)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">{fmtMoney(l.amount, currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink-2">{fmtMoney(l.monthly_installment, currency)}/mo</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{l.tenure_month} mo</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${m.cls}`}>{m.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{fmtDate(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedLoan && (
          <LoanDetailDrawer
            key={selectedLoan.id}
            loan={detail?.loan || selectedLoan}
            schedule={detail?.schedule || null}
            repayments={detail?.repayments || []}
            loading={detailLoading}
            busy={busy}
            currency={currency}
            employeeName={employeeName(selectedLoan)}
            typeName={typeName(detail?.loan || selectedLoan)}
            canReview={canReview}
            canAdminister={canAdminister}
            enabledMethods={enabledMethods}
            configEmpty={configEmpty}
            onOpenSettings={() => { setSelectedId(null); setShowSettings(true); }}
            onApprove={() => setApproveModal({ danger: false, label: "Approve loan" })}
            onReject={() => setApproveModal({ danger: true, label: "Reject loan" })}
            onRemind={() => remind(selectedLoan)}
            onAssignMethod={assignMethod}
            onRecordRepayment={() => setShowRepayModal(true)}
            onClose={() => setSelectedId(null)}
          />
        )}

        {approveModal && (
          <ApproveModal
            title={approveModal.label}
            danger={approveModal.danger}
            busy={busy}
            onClose={() => setApproveModal(null)}
            onSubmit={runApproveAction}
          />
        )}

        {showRepayModal && selectedLoan && (
          <RecordRepaymentModal
            outstanding={
              detail?.schedule?.summary
                ? Number(detail.schedule.summary.outstanding_balance)
                : outstandingOf(detail?.loan || selectedLoan)
            }
            currency={currency}
            busy={busy}
            onClose={() => setShowRepayModal(false)}
            onSubmit={submitRepayment}
          />
        )}

        {typeModal && (
          <LoanTypeModal
            loanType={typeModal.loanType}
            busy={busy}
            onClose={() => setTypeModal(null)}
            onSubmit={saveLoanType}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function LoanDetailDrawer({
  loan,
  schedule,
  repayments,
  loading,
  busy,
  currency,
  employeeName,
  typeName,
  canReview,
  canAdminister,
  enabledMethods,
  configEmpty,
  onOpenSettings,
  onApprove,
  onReject,
  onRemind,
  onAssignMethod,
  onRecordRepayment,
  onClose,
}) {
  const status = statusOf(loan);
  const meta = statusMeta(status);
  const summary = schedule?.summary || null;
  // summary.outstanding_balance is the money truth once the schedule loads;
  // the row-level computation only bridges the gap.
  const outstanding = summary ? Number(summary.outstanding_balance) : outstandingOf(loan);
  const amountRepaid = summary ? Number(summary.amount_repaid) : Number(loan.amount_repaid || 0);

  const pending = status === "pending_approval";
  const repayable = ["approved", "active"].includes(status);

  // Keyed by loan id at the call site, so this initializer runs per loan; a
  // successful assign leaves the local value equal to the refreshed loan's.
  const [method, setMethod] = useState(loan.repayment_method || "");

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-2xl flex-col bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line-soft p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white">
              {getInitials(employeeName)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-ink">{employeeName}</h3>
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="truncate">{typeName}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>{meta.label}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {/* Actions */}
          {(pending || (repayable && canAdminister)) && (
            <div className="flex flex-wrap gap-2">
              {pending && canReview && (
                <>
                  <button
                    disabled={busy || loading}
                    onClick={onApprove}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    disabled={busy || loading}
                    onClick={onReject}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </>
              )}
              {pending && (
                <button
                  disabled={busy || loading}
                  onClick={onRemind}
                  className="inline-flex items-center gap-1 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-sunken disabled:opacity-60"
                >
                  <BellRing className="h-3.5 w-3.5" /> Remind approvers
                  {Number(loan.reminder_count) > 0 && <span className="text-ink-faint">({loan.reminder_count} sent)</span>}
                </button>
              )}
              {repayable && canAdminister && loan.repayment_method === "external" && (
                <button
                  disabled={busy || loading}
                  onClick={onRecordRepayment}
                  className="inline-flex items-center gap-1 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                >
                  <Banknote className="h-3.5 w-3.5" /> Record repayment
                </button>
              )}
            </div>
          )}

          {/* Lifecycle */}
          {meta.step < 0 ? (
            <div
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs ${
                status === "cancelled"
                  ? "border-line bg-sunken text-ink-muted"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                This loan was <span className="font-semibold lowercase">{meta.label}</span>
                {status === "rejected" && loan.rejected_at ? ` on ${fmtDate(loan.rejected_at)}` : ""} — no further actions apply.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {MILESTONES.map((ms, i) => {
                const done = meta.step >= ms.at;
                const active = meta.step === ms.at - 1;
                return (
                  <div key={ms.label} className="contents">
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
                  </div>
                );
              })}
            </div>
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Amount", fmtMoney(loan.amount, currency)],
              ["Installment / mo", fmtMoney(loan.monthly_installment, currency)],
              ["Total repayable", fmtMoney(loan.total_repayable, currency)],
              ["Repaid", fmtMoney(amountRepaid, currency)],
              ["Outstanding", fmtMoney(outstanding, currency)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
                <div className="mt-0.5 text-sm font-bold text-ink">{value}</div>
              </div>
            ))}
          </div>

          {/* Terms & reason */}
          <div className="rounded-xl border border-line p-4">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <span className="block text-ink-faint">Interest</span>
                <span className="font-semibold text-ink">{Number(loan.interest_rate)}% / yr</span>
              </div>
              <div>
                <span className="block text-ink-faint">Tenure</span>
                <span className="font-semibold text-ink">{loan.tenure_month} months</span>
              </div>
              <div>
                <span className="block text-ink-faint">Period</span>
                <span className="font-semibold text-ink">{fmtDate(loan.start_date)} → {fmtDate(loan.end_date)}</span>
              </div>
              <div>
                <span className="block text-ink-faint">Method</span>
                <span className="font-semibold text-ink">
                  {REPAYMENT_METHODS.find((m) => m.key === loan.repayment_method)?.label || "Not assigned"}
                </span>
              </div>
            </div>
            {loan.reason && (
              <p className="mt-3 border-t border-line-soft pt-3 text-xs text-ink-muted">{loan.reason}</p>
            )}
          </div>

          {/* Repayment method assignment */}
          {repayable && canAdminister && (
            <div className="rounded-xl border border-line p-4">
              <h4 className="text-sm font-semibold text-ink">Repayment method</h4>
              {configEmpty ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <span>No repayment methods are enabled for the organization yet, so none can be assigned to this loan.</span>
                  <button onClick={onOpenSettings} className="font-semibold text-amber-700 underline">
                    Open loan settings
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="min-w-[220px] flex-1">
                    <label className={labelCls}>Method</label>
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                      <option value="">— Select method —</option>
                      {REPAYMENT_METHODS.filter((m) => enabledMethods.includes(m.key)).map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    disabled={busy || loading || !method || method === (loan.repayment_method || "")}
                    onClick={() => onAssignMethod(method)}
                    className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Save
                  </button>
                  <p className="w-full text-[11px] text-ink-faint">
                    Payroll-deduction installments are collected automatically on approved payroll distributions; external loans are settled with “Record repayment”.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Repayment schedule */}
          <div className="rounded-xl border border-line">
            <div className="border-b border-line-soft px-4 py-3">
              <h4 className="text-sm font-semibold text-ink">Repayment schedule</h4>
            </div>
            {loading ? (
              <div className="p-6 text-center text-xs text-ink-faint">Loading schedule…</div>
            ) : !schedule?.schedule?.length ? (
              <div className="p-6 text-center text-xs text-ink-faint">No schedule available for this loan.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-sunken/60 text-[10px] uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Due date</th>
                        <th className="px-3 py-2 text-right font-semibold">Scheduled</th>
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                        <th className="px-3 py-2 text-left font-semibold">Paid on</th>
                        <th className="px-3 py-2 text-right font-semibold">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.schedule.map((p) => (
                        <tr key={p.period} className="border-t border-line-soft">
                          <td className="px-3 py-2 text-ink-muted">{p.period}</td>
                          {/* due_date is already 'YYYY-MM-DD' */}
                          <td className="whitespace-nowrap px-3 py-2 text-ink-2">{p.due_date}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-ink-2">{fmtMoney(p.scheduled_amount, currency)}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${SCHEDULE_CHIP[p.status] || "bg-sunken text-ink-muted"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{fmtDate(p.payment_date)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-ink">
                            {p.amount_paid != null ? fmtMoney(p.amount_paid, currency) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {summary && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-gradient-to-r from-brand/10 to-brand-2/5 px-4 py-3">
                    <div className="text-xs text-ink-muted">
                      {summary.periods_paid} of {summary.periods_paid + summary.periods_remaining} periods paid ·{" "}
                      {fmtMoney(summary.amount_repaid, currency)} repaid of {fmtMoney(summary.total_repayable, currency)}
                    </div>
                    <div className="text-sm font-bold text-brand">Outstanding: {fmtMoney(summary.outstanding_balance, currency)}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Repayments history */}
          <div className="rounded-xl border border-line">
            <div className="border-b border-line-soft px-4 py-3">
              <h4 className="text-sm font-semibold text-ink">Repayments</h4>
            </div>
            {loading ? (
              <div className="p-6 text-center text-xs text-ink-faint">Loading repayments…</div>
            ) : repayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-faint">No repayments recorded yet.</div>
            ) : (
              <ul className="divide-y divide-line-soft">
                {repayments.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">
                        {fmtMoney(r.amount, currency)}
                        <span
                          className={`ml-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            r.payroll_run_id ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {r.payroll_run_id ? "Payroll run" : "Manual"}
                        </span>
                      </div>
                      {r.note && <div className="truncate text-xs text-ink-muted">{r.note}</div>}
                    </div>
                    <div className="shrink-0 text-xs text-ink-muted">{fmtDate(r.payment_date)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </>
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
              placeholder={danger ? "Why is this being rejected? The requester will see this…" : "Visible in the approval trail…"}
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

function RecordRepaymentModal({ outstanding, currency, busy, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!amount || !(n > 0)) return setError("Enter an amount greater than zero.");
    if (n > outstanding) {
      return setError(`Amount exceeds the outstanding balance (${fmtMoney(outstanding, currency)}).`);
    }
    if (!paymentDate) return setError("Pick the date the payment was received.");
    setError("");
    onSubmit({ amount: n, payment_date: paymentDate, note: note.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">Record repayment</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div className="rounded-xl bg-sunken p-3 text-xs text-ink-muted">
            Outstanding balance: <span className="font-bold text-ink">{fmtMoney(outstanding, currency)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls}
                placeholder="50000"
              />
            </div>
            <div>
              <label className={labelCls}>Payment date</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputCls} h-20 py-2 resize-none`}
              placeholder="e.g. Bank transfer ref. 004512"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={busy} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {busy ? "Saving…" : "Record repayment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoanTypeModal({ loanType, busy, onClose, onSubmit }) {
  const editing = !!loanType;
  const [name, setName] = useState(loanType?.name || "");
  const [rate, setRate] = useState(loanType != null ? String(Number(loanType.interest_per_annum)) : "");
  const [months, setMonths] = useState(loanType?.repayment_period_months ?? "");
  const [description, setDescription] = useState(loanType?.description || "");
  const [status, setStatus] = useState(loanType?.status || "active");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give the product a name — employees pick it when requesting.");
    const r = Number(rate);
    if (rate === "" || !(r >= 0)) return setError("Enter an interest rate of 0 or more (% per annum).");
    const m = Number(months);
    if (!Number.isInteger(m) || m < 1) return setError("Max tenure must be a whole number of months, at least 1.");
    setError("");
    onSubmit(
      {
        name: name.trim(),
        interest_per_annum: r,
        repayment_period_months: m,
        description: description.trim() || undefined,
        status,
      },
      loanType?.id
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">{editing ? "Edit loan product" : "New loan product"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div>
            <label className={labelCls}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Salary advance" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Interest (% / yr)</label>
              <input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} placeholder="5" />
            </div>
            <div>
              <label className={labelCls}>Max tenure (months)</label>
              <input type="number" min="1" step="1" value={months} onChange={(e) => setMonths(e.target.value)} className={inputCls} placeholder="12" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} h-20 py-2 resize-none`}
              placeholder="Shown to employees when they pick a product…"
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="active">Active — employees can request it</option>
              <option value="inactive">Inactive — hidden from new requests</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={busy} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {busy ? "Saving…" : editing ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoanAdminPage;
