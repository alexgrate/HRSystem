import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, FileText, UserCog, Check, X, Inbox } from "lucide-react";
import { approvalService } from "../../services/approvalService";
import { usePermissions } from "../../context/PermissionContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { getEmployeeName } from "../../utils/employee";

const personName = (r) => {
  const e = r.employee || r.user || r.requester || r;
  return getEmployeeName(e, r.employee_email || r.employee_id || "Employee");
};
const fmtDate = (d) => {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  return s;
};

const TABS = [
  {
    key: "leave", label: "Leave Requests", Icon: CalendarDays,
    resource: RESOURCE_CODES.LEAVE_REQUESTS, noun: "leave request",
    list: () => approvalService.getPendingLeave(),
    approve: (id) => approvalService.approveLeave(id),
    reject: (id) => approvalService.rejectLeave(id),
  },
  {
    key: "documents", label: "Documents", Icon: FileText,
    resource: RESOURCE_CODES.DOCUMENTS, noun: "document",
    list: () => approvalService.getPendingDocuments(),
    approve: (id) => approvalService.approveDocument(id),
    reject: (id) => approvalService.rejectDocument(id),
  },
  {
    key: "profile", label: "Profile Updates", Icon: UserCog,
    resource: RESOURCE_CODES.PROFILE_UPDATE, noun: "profile update",
    list: () => approvalService.getPendingProfileUpdates(),
    approve: (id) => approvalService.approveProfileUpdate(id),
    reject: (id) => approvalService.rejectProfileUpdate(id),
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
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const visibleTabs = TABS.filter((t) => can(t.resource, "read"));
  const activeTab = visibleTabs.find((t) => t.key === tab) || visibleTabs[0] || null;
  const canManage = activeTab ? can(activeTab.resource, "manage") : false;

  useEffect(() => {
    if (!activeTab) return;

    let stale = false;
    setLoading(true);
    (async () => {
      try {
        const res = await activeTab.list();
        if (!stale) setItems(Array.isArray(res) ? res : res?.data || res?.requests || res?.items || []);
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
      await (isApprove ? activeTab.approve(item.id) : activeTab.reject(item.id));
      toast.success(`${isApprove ? "Approved" : "Rejected"}.`);
      setItems((list) => list.filter((x) => x.id !== item.id));
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

      <div className="flex flex-wrap gap-1 rounded-xl border border-line/80 bg-card p-1 shadow-sm w-fit">
        {visibleTabs.map((t) => {
          const Icon = t.Icon;
          const isActive = activeTab.key === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${isActive ? "text-white" : "text-ink-muted"}`}
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
