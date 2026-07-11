import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, FileText, UserCog, Check, X, Inbox } from "lucide-react";
import { approvalService } from "../../services/approvalService";
import { usePermissions } from "../../context/PermissionContext";
import { useAuth } from "../../context/AuthContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { getEmployeeName } from "../../utils/employee";
import { isDesignatedApprover } from "../../utils/approvers";
import { setupService } from "../../services/setupService";
import api from "../../services/api";

const fmtDate = (d) => {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  return s;
};

const TABS = [
  {
    key: "leave", label: "Leave Requests", Icon: CalendarDays,
    resource: RESOURCE_CODES.LEAVE_REQUESTS, noun: "leave request", workflowType: "LEAVE_REQUEST",
    list: () => approvalService.getPendingLeave(),
    approve: (item) => approvalService.approveLeave(item.id, item.approval_request_id || null),
    reject: (item) => approvalService.rejectLeave(item.id, item.approval_request_id || null),
  },
  {
    key: "documents", label: "Documents", Icon: FileText,
    resource: RESOURCE_CODES.DOCUMENTS, noun: "document", workflowType: "DOCUMENT_UPLOAD",
    list: () => approvalService.getPendingDocuments(),
    approve: (item) => approvalService.approveDocument(item.id),
    reject: (item) => approvalService.rejectDocument(item.id),
  },
  {
    key: "profile", label: "Profile Updates", Icon: UserCog,
    resource: RESOURCE_CODES.PROFILE_UPDATE, noun: "profile update", workflowType: "EMPLOYEE_UPDATE",
    list: () => approvalService.getPendingProfileUpdates(),
    approve: (item) => approvalService.approveProfileUpdate(item.id),
    reject: (item) => approvalService.rejectProfileUpdate(item.id),
  },
];

const prettyField = (k) => k.replace(/_/g, " ");

const changeEntries = (item) => {
  const obj = item.changes || item.payload?.changes;
  if (obj && typeof obj === "object") return Object.entries(obj);
  const rows = item.items || item.request_items || [];
  return rows.map((r) => [r.column || r.column_name || r.field || "field", r.new_value ?? r.value ?? ""]);
};

const ApprovalsInboxPage = () => {
  const { can, isAdmin } = usePermissions();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [workflows, setWorkflows] = useState(null);
  const [staff, setStaff] = useState([]);

  // Request rows often carry only employee_id — resolve names via the staff
  // list when this user may read it. (Backend ask: embed the requester name
  // on the row, payroll-snapshot style, so every approver sees names.)
  useEffect(() => {
    if (!can(RESOURCE_CODES.EMPLOYEES, "read")) return;
    let stale = false;
    (async () => {
      try {
        const res = await api.get("/api/users/?page=1&limit=100");
        if (!stale) setStaff(Array.isArray(res) ? res : res?.users || []);
      } catch {
        /* names fall back to shortened ids */
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const personName = (r) => {
    const embedded = r.employee || r.user || r.requester;
    if (embedded && typeof embedded === "object") {
      const n = getEmployeeName(embedded, "");
      if (n) return n;
    }
    if (r.employee_name || r.snapshot?.employee_name) return r.employee_name || r.snapshot.employee_name;
    const id = r.employee_id || r.user_id || r.uploaded_by_employee_id;
    const s = staff.find((u) => u.id === id);
    if (s) return getEmployeeName(s);
    return r.employee_email || (id ? `${String(id).slice(0, 8)}…` : "Employee");
  };

  useEffect(() => {
    let stale = false;
    setupService.getWorkflows()
      .then((flows) => { if (!stale) setWorkflows(Array.isArray(flows) ? flows : null); })
      .catch(() => { /* fall back to permission-only gating */ });
    return () => { stale = true; };
  }, []);

  const visibleTabs = TABS.filter((t) => can(t.resource, "read"));
  const activeTab = visibleTabs.find((t) => t.key === tab) || visibleTabs[0] || null;
  // Manage permission AND designated approver on the matching workflow.
  const canManage = activeTab
    ? can(activeTab.resource, "manage") && isDesignatedApprover(workflows, activeTab.workflowType, user, isAdmin)
    : false;

  const fetchItems = async (tabDef) => {
    const res = await tabDef.list();
    return Array.isArray(res) ? res : res?.data || res?.requests || res?.items || [];
  };

  useEffect(() => {
    if (!activeTab) return;

    let stale = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetchItems(activeTab);
        if (!stale) setItems(res);
      } catch (err) {
        console.error("[Approvals] load failed:", err);
        if (!stale) setItems([]);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => { stale = true; };
  }, [activeTab?.key]);

  const act = async (item, action) => {
    const isApprove = action === "approve";
    const ok = await confirm({
      title: `${isApprove ? "Approve" : "Reject"} this ${activeTab.noun}?`,
      message: `From ${personName(item)}.`,
      confirmLabel: isApprove ? "Approve" : "Reject",
      danger: !isApprove,
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await (isApprove ? activeTab.approve(item) : activeTab.reject(item));
      // Multi-stage workflows can keep an item pending after one sign-off —
      // reload the queue and report what actually happened instead of
      // assuming the item is resolved.
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
        // Reload failed; fall back to removing the item locally.
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

  if (!activeTab) {
    return (
      <div className="p-8 text-center text-ink-muted border border-dashed border-line rounded-2xl bg-card">
        You don’t have access to any approval queues. Ask an administrator for the required permission.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Approvals</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Approvals Inbox</h1>
        <p className="mt-1 text-sm text-ink-muted">Review and action requests waiting on you.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-line/80 bg-card p-1 shadow-sm w-fit max-w-full">
        {visibleTabs.map((t) => {
          const Icon = t.Icon;
          const isActive = activeTab.key === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${isActive ? "text-white" : "text-ink-muted"}`}
            >
              {isActive && <motion.div layoutId="approvals-tab" className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand to-brand-2" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <Icon className="relative h-3.5 w-3.5" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-ink-muted bg-card rounded-2xl border border-line-soft">Loading pending approvals…</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-line rounded-2xl bg-card">
          <Inbox className="mx-auto h-12 w-12 text-ink-ghost" />
          <h3 className="mt-4 text-sm font-semibold text-ink">Nothing pending</h3>
          <p className="mt-1 text-xs text-ink-muted">No {activeTab.noun}s are waiting for approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`flex items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-4 shadow-sm ${busyId === item.id ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{personName(item)}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
                  </div>
                  {activeTab.key === "leave" ? (
                    <div className="mt-1 text-sm text-ink-muted">
                      <span className="font-medium">{item.leave_type?.name || item.leave_type_name || "Leave"}</span>
                      {" · "}{fmtDate(item.start_date)} → {fmtDate(item.end_date)}
                      {item.reason && <div className="mt-0.5 text-xs text-ink-muted">“{item.reason}”</div>}
                    </div>
                  ) : activeTab.key === "profile" ? (
                    <div className="mt-1 text-sm text-ink-muted">
                      <span className="font-medium">Requested changes</span>
                      <ul className="mt-1 space-y-0.5 text-xs text-ink-muted">
                        {changeEntries(item).map(([k, v]) => (
                          <li key={k}>
                            <span className="font-semibold capitalize text-ink-muted">{prettyField(k)}:</span> {String(v)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-ink-muted">
                      <span className="font-medium">{item.name || item.document_type?.name || item.file_name || "Document"}</span>
                      {(item.file_url || item.url) && (
                        <a href={item.file_url || item.url} target="_blank" rel="noreferrer" className="ml-2 text-xs font-semibold text-brand hover:underline">View</a>
                      )}
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => act(item, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => act(item, "reject")} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600">
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ApprovalsInboxPage;
