import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  CalendarDays, FileText, UserCog, HandCoins, Check, X, Inbox, Search,
  RefreshCw, ChevronRight, CheckCircle2, Circle, Clock, MessageSquareText,
} from "lucide-react";
import { approvalService } from "../../services/approvalService";
import { loanService } from "../../services/loanService";
import { setupService } from "../../services/setupService";
import { orgService } from "../../services/orgService";
import { fmtMoney } from "../../utils/payroll";
import { useConfig } from "../../context/ConfigContext";
import { usePermissions } from "../../context/PermissionContext";
import { useAuth } from "../../context/AuthContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { resolvePersonName } from "../../utils/employee";
import { isDesignatedApprover } from "../../utils/approvers";
import { TabPills } from "../../components/ui/TabPills";
import { previewDocument } from "../../utils/documentPreview";
import { ErrorState } from "../../components/ui/ErrorState";

const fmtDate = (d) => {
  if (!d) return "—";
  return String(d).slice(0, 10);
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return String(d).slice(0, 16).replace("T", " ");
  return t.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

// Best-available submission date on a request row, across the queue shapes.
const rowDate = (r) =>
  r?.created_at || r?.createdAt || r?.requested_at || r?.submitted_at ||
  r?.applied_at || r?.start_date || null;

const TABS = [
  {
    key: "leave", label: "Leave Requests", Icon: CalendarDays,
    resource: RESOURCE_CODES.LEAVE_REQUESTS, noun: "leave request", workflowType: "LEAVE_REQUEST",
    supportsNotes: true,
    list: () => approvalService.getPendingLeave(),
    approvalRequestId: (item) => item.approval_request_id || null,
    approve: (item, comment) => approvalService.approveLeave(item.id, item.approval_request_id || null, comment),
    reject: (item, comment) => approvalService.rejectLeave(item.id, item.approval_request_id || null, comment),
  },
  {
    key: "documents", label: "Documents", Icon: FileText,
    resource: RESOURCE_CODES.DOCUMENTS, noun: "document", workflowType: "DOCUMENT_UPLOAD",
    supportsNotes: true,
    list: () => approvalService.getPendingDocuments(),
    approvalRequestId: (item) => item.approval_request_id || null,
    approve: (item, comment) => approvalService.approveDocument(item.id, comment),
    reject: (item, comment) => approvalService.rejectDocument(item.id, comment),
  },
  {
    key: "profile", label: "Profile Updates", Icon: UserCog,
    resource: RESOURCE_CODES.PROFILE_UPDATE, noun: "profile update", workflowType: "EMPLOYEE_UPDATE",
    // Profile updates are reviewed directly (approve-all / reject-all) and are NOT
    // routed through the multi-stage approval engine, so there is no workflow
    // timeline to show and the backend does not persist a reviewer comment.
    supportsNotes: false,
    list: () => approvalService.getPendingProfileUpdates(),
    approvalRequestId: () => null,
    // Profile-update rows are keyed by request_id (not id) — using item.id sent
    // "undefined" to the backend and 500'd on the uuid cast.
    approve: (item) => approvalService.approveProfileUpdate(item.request_id || item.id),
    reject: (item) => approvalService.rejectProfileUpdate(item.request_id || item.id),
  },
  {
    key: "loans", label: "Loans", Icon: HandCoins,
    resource: RESOURCE_CODES.LOANS, noun: "loan request", workflowType: "LOAN_REQUEST",
    supportsNotes: true,
    // GET /all is admin-gated server-side: designated approvers who aren't
    // admins land in the catch and see an empty queue here — they still act
    // from the Loans page. (Backend ask: an approver-scoped pending list.)
    list: () =>
      loanService.listAll().then((rows) =>
        (Array.isArray(rows) ? rows : []).filter((r) => String(r.status).toLowerCase() === "pending_approval")
      ),
    approvalRequestId: (item) => item.approval_request_id || null,
    approve: (item, comment) => loanService.approve(item.id, item.approval_request_id || null, comment),
    reject: (item, comment) => loanService.reject(item.id, item.approval_request_id || null, comment),
  },
];

const SORTS = [
  { key: "recent", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Requester A–Z" },
];

const prettyField = (k) => String(k || "").replace(/_/g, " ");

// Profile-update values are stored wrapped as { value: ... }; unwrap for display.
const unwrapValue = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return v.value ?? v.new_value ?? v.old_value ?? "";
  return String(v);
};

const changeEntries = (item) => {
  const obj = item.changes || item.payload?.changes;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj).map(([field, to]) => ({ field, group: null, from: "", to: unwrapValue(to) }));
  }
  const rows = item.items || item.request_items || [];
  return rows.map((r) => ({
    field: r.field_name || r.column || r.column_name || r.field || "field",
    group: r.field_group || null,
    from: unwrapValue(r.old_value),
    to: unwrapValue(r.new_value ?? r.value),
  }));
};

// Per-tab request body, shared by the card and the drawer so the two never drift.
const RequestBody = ({ item, tabKey, currency, toast, dense = false }) => {
  if (tabKey === "leave") {
    return (
      <div className="text-sm text-ink-muted">
        <span className="font-medium text-ink">{item.leave_type?.name || item.leave_type_name || "Leave"}</span>
        {" · "}{fmtDate(item.start_date)} → {fmtDate(item.end_date)}
        {item.reason && <div className={`mt-0.5 text-xs text-ink-muted break-words ${dense ? "" : "line-clamp-2"}`}>“{item.reason}”</div>}
      </div>
    );
  }
  if (tabKey === "loans") {
    return (
      <div className="text-sm text-ink-muted">
        <span className="font-medium text-ink">{fmtMoney(item.amount, currency)}</span>
        {" over "}{Math.trunc(Number(item.tenure_month)) || "—"} months
        {" · "}{fmtMoney(item.monthly_installment, currency)}/month
        {item.reason && <div className={`mt-0.5 text-xs text-ink-muted break-words ${dense ? "" : "line-clamp-2"}`}>“{item.reason}”</div>}
      </div>
    );
  }
  if (tabKey === "profile") {
    const entries = changeEntries(item);
    return (
      <div className="text-sm text-ink-muted">
        <span className="font-medium text-ink">Requested changes</span>
        {entries.length === 0 ? (
          <div className="mt-1 text-xs text-ink-faint">
            {item.total_items
              ? `${item.total_items} field update${item.total_items === 1 ? "" : "s"} pending review`
              : "No field details available."}
          </div>
        ) : (
          <ul className="mt-1 space-y-1 text-xs text-ink-muted">
            {entries.map((c) => (
              <li key={`${c.group || ""}-${c.field}`}>
                <span className="font-semibold capitalize text-ink">{prettyField(c.field)}</span>
                {c.group && <span className="text-ink-faint"> · {c.group}</span>}
                <div className="mt-0.5">
                  {c.from ? (
                    <>
                      <span className="text-ink-faint line-through">{c.from}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-ink">{c.to || "—"}</span>
                    </>
                  ) : (
                    <span className="font-medium text-ink">{c.to || "—"}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  // documents
  return (
    <div className="text-sm text-ink-muted">
      <span className="font-medium text-ink">
        {item.title || item.name || item.document_type?.name || item.original_file_name || item.file_name || "Document"}
      </span>
      {item.id && (
        <button
          type="button"
          onClick={() => previewDocument(item.id, toast)}
          className="ml-2 text-xs font-semibold text-brand hover:underline"
        >
          Preview
        </button>
      )}
    </div>
  );
};

// ─── Workflow timeline / history, powered by the approval-request detail API ───
const StageBadge = ({ detail }) => {
  if (!detail) return null;
  const total = detail.total_steps || detail.steps?.length || 0;
  const cur = detail.current_step_order || 0;
  const status = String(detail.status || "").toLowerCase();
  let text;
  if (status === "approved") text = "Fully approved";
  else if (status === "rejected") text = "Rejected";
  else text = total ? `Stage ${Math.min(cur, total)} of ${total}` : "In review";
  const tone =
    status === "approved" ? "bg-emerald-50 text-emerald-700"
      : status === "rejected" ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{text}</span>;
};

const Timeline = ({ detail }) => {
  const steps = [...(detail.steps || [])].sort((a, b) => a.step_order - b.step_order);
  const actions = detail.actions || [];
  const status = String(detail.status || "").toLowerCase();
  const cur = detail.current_step_order || 0;

  const stepState = (order) => {
    if (status === "rejected" && order === cur) return "rejected";
    if (status === "approved") return "done";
    if (order < cur) return "done";
    if (order === cur) return "current";
    return "upcoming";
  };

  return (
    <ol className="space-y-3">
      {steps.map((s) => {
        const st = stepState(s.step_order);
        const stepActions = actions.filter((a) => a.step_order === s.step_order);
        const Icon = st === "done" ? CheckCircle2 : st === "rejected" ? X : st === "current" ? Clock : Circle;
        const iconColor =
          st === "done" ? "text-emerald-600" : st === "rejected" ? "text-red-600"
            : st === "current" ? "text-amber-600" : "text-ink-ghost";
        return (
          <li key={s.step_order} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  Step {s.step_order} · {s.approver_job_role_name || "Approver"}
                </span>
                <span className="rounded-full bg-line-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                  {s.require_all_approvers ? "All approvers" : "Any approver"}
                </span>
              </div>
              {stepActions.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {stepActions.map((a, i) => (
                    <li key={i} className="text-xs text-ink-muted">
                      <span className="font-medium text-ink">{a.approver_name}</span>
                      {" "}
                      <span className={a.action === "approved" ? "text-emerald-600" : "text-red-600"}>
                        {a.action === "approved" ? "approved" : "rejected"}
                      </span>
                      {" · "}{fmtDateTime(a.acted_at)}
                      {a.comment && (
                        <div className="mt-0.5 flex items-start gap-1 text-ink-muted">
                          <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0 text-ink-ghost" aria-hidden="true" />
                          <span className="min-w-0 break-words italic">“{a.comment}”</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-0.5 text-xs text-ink-faint">
                  {st === "current" ? "Awaiting decision" : st === "upcoming" ? "Not yet reached" : "—"}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

// ─── Details drawer ───
const ApprovalDrawer = ({ item, tab, personName, currency, canManage, busy, onAct, onClose, toast }) => {
  const reduce = useReducedMotion();
  const [detail, setDetail] = useState(null);
  const [detailState, setDetailState] = useState("idle"); // idle | loading | ready | error | none
  const [comment, setComment] = useState("");
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const prevFocus = useRef(null);

  const approvalRequestId = tab.approvalRequestId(item);

  // Load the workflow timeline/history for engine-backed requests only.
  useEffect(() => {
    if (!approvalRequestId) { setDetailState("none"); return; }
    let stale = false;
    setDetailState("loading");
    setupService.getApprovalRequestDetail(approvalRequestId)
      .then((d) => { if (!stale) { setDetail(d); setDetailState("ready"); } })
      .catch(() => { if (!stale) setDetailState("error"); });
    return () => { stale = true; };
  }, [approvalRequestId]);

  // Focus management + Escape + scroll lock (a11y).
  useEffect(() => {
    prevFocus.current = document.activeElement;
    const t = setTimeout(() => closeRef.current?.focus(), 0);
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        );
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      if (prevFocus.current instanceof HTMLElement) prevFocus.current.focus();
    };
  }, [onClose]);

  const doAct = (action) => onAct(item, action, tab.supportsNotes ? comment.trim() || undefined : undefined);

  // Drawer sits at z-90 — below the notification layer (toast z-100, confirm z-110 in
  // Notifications.jsx) so the approve/reject confirm dialog and success toast render
  // ABOVE the drawer, and above the app chrome (sidebar/header z-20…50) so it overlays.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end" role="presentation">
      <motion.div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-drawer-title"
        initial={reduce ? { opacity: 0 } : { x: "100%" }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: "100%" }}
        transition={{ type: "tween", duration: 0.22 }}
        className="relative flex h-full w-full max-w-md flex-col bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-brand">{tab.label}</div>
            <h2 id="approval-drawer-title" className="mt-0.5 truncate text-lg font-bold text-ink">{personName(item)}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
              {detailState === "ready" && <StageBadge detail={detail} />}
              <span className="text-xs text-ink-faint">Submitted {fmtDateTime(rowDate(item))}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-line-soft hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Request</h3>
            <RequestBody item={item} tabKey={tab.key} currency={currency} toast={toast} dense />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Approval workflow</h3>
            {detailState === "loading" && <div className="text-sm text-ink-muted">Loading timeline…</div>}
            {detailState === "error" && <div className="text-sm text-ink-muted">Couldn’t load the approval timeline.</div>}
            {detailState === "none" && (
              <div className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-ink-muted">
                This request is reviewed directly and isn’t part of a multi-stage approval workflow.
              </div>
            )}
            {detailState === "ready" && detail && (
              (detail.steps || []).length > 0
                ? <Timeline detail={detail} />
                : <div className="text-sm text-ink-muted">No workflow steps are configured for this request.</div>
            )}
          </section>
        </div>

        {/* Action footer */}
        {canManage && (
          <div className="border-t border-line-soft px-5 py-4 space-y-3">
            {tab.supportsNotes && (
              <div>
                <label htmlFor="approval-note" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Add a note <span className="font-normal normal-case text-ink-ghost">(optional)</span>
                </label>
                <textarea
                  id="approval-note"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Reason or context for this decision…"
                  className="w-full resize-none rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-ghost focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => doAct("approve")}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => doAct("reject")}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        )}
      </motion.aside>
    </div>,
    document.body
  );
};

const ApprovalsInboxPage = () => {
  const { can, isAdmin } = usePermissions();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { config } = useConfig();
  const currency = config?.currency || "NGN";

  const [tab, setTab] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [workflows, setWorkflows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("recent");
  const [openItem, setOpenItem] = useState(null);

  // Names: the org directory is a single call any authenticated employee may read
  // (id + biodata), so even non-admin approvers see requester names — unlike the
  // roster, which is EMPLOYEE:read-gated and paginates over the whole workforce.
  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const res = await orgService.listDirectory();
        if (!stale) setStaff(Array.isArray(res) ? res : []);
      } catch {
        /* names fall back to email / shortened ids */
      }
    })();
    return () => { stale = true; };
  }, []);

  const personName = useCallback((r) => resolvePersonName(r, staff, "Employee"), [staff]);

  useEffect(() => {
    let stale = false;
    setupService.getWorkflows()
      .then((flows) => { if (!stale) setWorkflows(Array.isArray(flows) ? flows : null); })
      .catch(() => { /* fall back to permission-only gating */ });
    return () => { stale = true; };
  }, []);

  const visibleTabs = TABS.filter((t) => can(t.resource, "read"));
  const activeTab = visibleTabs.find((t) => t.key === tab) || visibleTabs[0] || null;

  // Leave approve/reject is authorized backend-side by being the workflow's
  // designated approver (job role) ALONE — no RBAC 'manage'. Other tabs
  // genuinely require the RBAC review/manage permission, so keep the conjunct.
  const canManage = activeTab
    ? activeTab.resource === RESOURCE_CODES.LEAVE_REQUESTS
      ? isDesignatedApprover(workflows, activeTab.workflowType, user, isAdmin)
      : can(activeTab.resource, "manage") && isDesignatedApprover(workflows, activeTab.workflowType, user, isAdmin)
    : false;

  const fetchItems = useCallback(async (tabDef) => {
    const res = await tabDef.list();
    const rows = Array.isArray(res) ? res : res?.data || res?.requests || res?.items || [];
    return rows.map((r) => (r && r.id == null && r.request_id ? { ...r, id: r.request_id } : r));
  }, []);

  const loadActive = useCallback(async ({ silent = false } = {}) => {
    if (!activeTab) return;
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetchItems(activeTab);
      setItems(res);
      setError(false);
    } catch (err) {
      console.error("[Approvals] load failed:", err);
      // A failed load must not read as "Nothing pending" — surface it so an
      // approver knows the queue is unavailable, not empty.
      if (!silent) { setItems([]); setError(true); }
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, [activeTab, fetchItems]);

  useEffect(() => {
    if (!activeTab) return;
    let stale = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetchItems(activeTab);
        if (!stale) { setItems(res); setError(false); }
      } catch (err) {
        console.error("[Approvals] load failed:", err);
        if (!stale) { setItems([]); setError(true); }
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.key]);

  // Live-ish queue: re-pull the active tab when the window regains focus, so an
  // approver returning to the tab doesn't act on a stale (already-decided) row.
  useEffect(() => {
    const onFocus = () => loadActive({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadActive]);

  const act = async (item, action, comment) => {
    const isApprove = action === "approve";
    const ok = await confirm({
      title: `${isApprove ? "Approve" : "Reject"} this ${activeTab.noun}?`,
      message: `From ${personName(item)}.${comment ? ` Note: “${comment}”` : ""}`,
      confirmLabel: isApprove ? "Approve" : "Reject",
      danger: !isApprove,
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await (isApprove ? activeTab.approve(item, comment) : activeTab.reject(item, comment));
      setOpenItem(null);
      try {
        const next = await fetchItems(activeTab);
        setItems(next);
        const stillPending = next.some((x) => x.id === item.id);
        toast.success(
          stillPending
            ? `${isApprove ? "Approval" : "Rejection"} recorded — awaiting the remaining approval stages.`
            : `${isApprove ? "Approved" : "Rejected"}.`
        );
      } catch {
        setItems((list) => list.filter((x) => x.id !== item.id));
        toast.success(`${isApprove ? "Approved" : "Rejected"}.`);
      }
    } catch (err) {
      console.error("[Approvals] action failed:", err);
      toast.error(err?.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  // Client-side search + sort over the loaded queue page.
  const searchText = useCallback((item) => {
    const parts = [
      personName(item), item.reason,
      item.leave_type?.name, item.leave_type_name,
      item.title, item.name, item.original_file_name, item.file_name,
      item.amount != null ? String(item.amount) : "",
      ...changeEntries(item).map((c) => `${c.field} ${c.to}`),
    ];
    return parts.filter(Boolean).join(" ").toLowerCase();
  }, [personName]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q ? items.filter((it) => searchText(it).includes(q)) : items.slice();
    rows.sort((a, b) => {
      if (sortKey === "name") return personName(a).localeCompare(personName(b));
      const da = new Date(rowDate(a) || 0).getTime();
      const db = new Date(rowDate(b) || 0).getTime();
      return sortKey === "oldest" ? da - db : db - da;
    });
    return rows;
  }, [items, query, sortKey, searchText, personName]);

  if (!activeTab) {
    return (
      <div className="p-8 text-center text-ink-muted border border-dashed border-line rounded-2xl bg-card">
        You don’t have access to any approval queues. Ask an administrator for the required permission.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Approvals</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Approvals Inbox</h1>
          <p className="mt-1 text-sm text-ink-muted">Review and action requests waiting on you.</p>
        </div>
        <button
          type="button"
          onClick={() => loadActive({ silent: true })}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-line-soft disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <TabPills layoutId="approvals-tab" active={activeTab.key} onChange={(k) => { setTab(k); setQuery(""); }} tabs={visibleTabs} />

      {/* Toolbar: search + sort + count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="approval-search" className="sr-only">Search {activeTab.noun}s</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-ghost" aria-hidden="true" />
          <input
            id="approval-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${activeTab.noun}s…`}
            className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-ghost focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="approval-sort" className="sr-only">Sort</label>
          <select
            id="approval-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <span className="ml-auto text-xs text-ink-faint" aria-live="polite">
          {visibleItems.length} {visibleItems.length === 1 ? "request" : "requests"}
          {query && items.length !== visibleItems.length ? ` of ${items.length}` : ""}
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-ink-muted bg-card rounded-2xl border border-line-soft">Loading pending approvals…</div>
      ) : error ? (
        <ErrorState
          title="Couldn’t load the approval queue"
          message="The pending approvals failed to load — this isn’t the same as an empty queue. Please retry."
          onRetry={() => loadActive()}
          retrying={loading}
        />
      ) : items.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-line rounded-2xl bg-card">
          <Inbox className="mx-auto h-12 w-12 text-ink-ghost" />
          <h3 className="mt-4 text-sm font-semibold text-ink">Nothing pending</h3>
          <p className="mt-1 text-xs text-ink-muted">No {activeTab.noun}s are waiting for approval.</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-line rounded-2xl bg-card">
          <Search className="mx-auto h-8 w-8 text-ink-ghost" />
          <p className="mt-3 text-sm text-ink-muted">No {activeTab.noun}s match “{query}”.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visibleItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`flex flex-col gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${busyId === item.id ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{personName(item)}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
                    <span className="text-xs text-ink-faint">{fmtDate(rowDate(item))}</span>
                  </div>
                  <div className="mt-1">
                    <RequestBody item={item} tabKey={activeTab.key} currency={currency} toast={toast} />
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenItem(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-line-soft"
                  >
                    Details <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {canManage && (
                    <>
                      <button onClick={() => act(item, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => act(item, "reject")} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600">
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {openItem && (
          <ApprovalDrawer
            key={openItem.id}
            item={openItem}
            tab={activeTab}
            personName={personName}
            currency={currency}
            canManage={canManage}
            busy={busyId === openItem.id}
            onAct={act}
            onClose={() => setOpenItem(null)}
            toast={toast}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApprovalsInboxPage;
