import { useEffect, useMemo, useState } from "react";
import { TabPills } from "../../components/ui/TabPills";
import { Search, Check, X, BellRing, CalendarDays, CalendarClock, Plus, AlertCircle } from "lucide-react";
import { leaveService } from "../../services/leaveService";
import { administrationPeriodService, periodDate } from "../../services/administrationPeriodService";
import { approvalService } from "../../services/approvalService";
import { setupService } from "../../services/setupService";
import { usePermissions } from "../../context/PermissionContext";
import { useAuth } from "../../context/AuthContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { resolvePersonName } from "../../utils/employee";
import { statusBadgeCls } from "../../utils/status";
import { inclusiveDays } from "../../utils/leave";
import { isDesignatedApprover } from "../../utils/approvers";
import { orgService } from "../../services/orgService";

const STATUS_TABS = [
  { key: "pending", label: "Pending", matches: ["pend"] },
  { key: "approved", label: "Approved", matches: ["approv"] },
  // The "didn't happen" bucket — the backend emits rejected, declined and
  // cancelled, and all three belong here, not only under All.
  { key: "rejected", label: "Rejected", matches: ["reject", "decl", "cancel"] },
  { key: "all", label: "All" },
];

const statusOf = (r) => String(r.status || "pending").toLowerCase();

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

const LeaveAdminPage = () => {
  const { can, isAdmin } = usePermissions();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [workflows, setWorkflows] = useState(null);

  // Leave approve/reject is authorized backend-side by being the workflow's
  // designated approver (job role) alone — no RBAC 'manage' is required (the
  // backend performs no manage check). Gate on the designated-approver signal to
  // match, so an authorized approver is not hidden from the controls.
  const canManage = isDesignatedApprover(workflows, "LEAVE_REQUEST", user, isAdmin);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Administration periods gate every leave request (the range must sit
  // inside one active/scheduled period). null = not loaded yet, so the
  // "no window open" banner can't flash before the first fetch resolves.
  const [periods, setPeriods] = useState(null);
  const [showPeriods, setShowPeriods] = useState(false);
  const [periodModal, setPeriodModal] = useState(null); // { mode: 'open' | 'schedule' }

  const loadPeriods = async () => {
    try {
      const rows = await administrationPeriodService.list();
      setPeriods(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[LeaveAdmin] Periods load failed:", err);
      setPeriods(null);
    }
  };

  useEffect(() => {
    // The list endpoint is admin-only; non-admin approvers keep periods=null
    // (unknown) and never see the banner or the manage panel.
    if (!isAdmin) return;
    let stale = false;
    (async () => {
      try {
        const rows = await administrationPeriodService.list();
        if (!stale) setPeriods(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error("[LeaveAdmin] Periods load failed:", err);
      }
    })();
    return () => { stale = true; };
  }, [isAdmin]);

  const activePeriod = Array.isArray(periods)
    ? periods.find((p) => String(p.status).toLowerCase() === "active") || null
    : null;

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const [reqs, types, users, flows] = await Promise.all([
          // Org-wide list; a non-admin approver may 403 on /all, in which
          // case fall back to their own requests rather than an empty page.
          leaveService.listAll().catch(() => leaveService.list()),
          setupService.getLeaveTypes().catch(() => []),
          orgService.listAllUsers().catch(() => []),
          setupService.getWorkflows().catch(() => null),
        ]);
        if (stale) return;
        setRequests(Array.isArray(reqs) ? reqs : []);
        setLeaveTypes(Array.isArray(types) ? types : []);
        setStaff(Array.isArray(users) ? users : users?.users || []);
        setWorkflows(Array.isArray(flows) ? flows : null);
      } catch (err) {
        console.error("[LeaveAdmin] Load failed:", err);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => { stale = true; };
  }, []);

  const typeName = (r) =>
    r.leave_type?.name ||
    r.leave_type_name ||
    leaveTypes.find((t) => t.id === (r.leave_type_id || r.leave_type))?.name ||
    "Leave";

  const requesterName = (r) => resolvePersonName(r, staff, "Employee");

  const today = new Date().toISOString().slice(0, 10);
  const counts = useMemo(() => {
    const pending = requests.filter((r) => statusOf(r).startsWith("pend")).length;
    const approved = requests.filter((r) => statusOf(r).startsWith("approv"));
    const onLeaveToday = approved.filter(
      (r) => fmtDate(r.start_date) <= today && today <= fmtDate(r.end_date)
    ).length;
    return { pending, approved: approved.length, onLeaveToday };
  }, [requests, today]);

  const visible = useMemo(() => {
    let list = requests;
    const tabDef = STATUS_TABS.find((t) => t.key === tab);
    if (tabDef?.matches) list = list.filter((r) => tabDef.matches.some((p) => statusOf(r).startsWith(p)));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) =>
        [requesterName(r), typeName(r), r.reason || ""].join(" ").toLowerCase().includes(s)
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, tab, q, staff, leaveTypes]);

  const patchLocal = (id, changes) =>
    setRequests((list) => list.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const act = async (r, action) => {
    const isApprove = action === "approve";
    const ok = await confirm({
      title: `${isApprove ? "Approve" : "Reject"} this leave request?`,
      message: `${requesterName(r)} · ${typeName(r)} · ${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}`,
      confirmLabel: isApprove ? "Approve" : "Reject",
      danger: !isApprove,
    });
    if (!ok) return;
    setBusyId(r.id);
    try {
      const approvalRequestId = r.approval_request_id || r.approvalRequestId || null;
      await (isApprove
        ? approvalService.approveLeave(r.id, approvalRequestId)
        : approvalService.rejectLeave(r.id, approvalRequestId));
      // One sign-off may not finalize the request (multi-stage workflows keep
      // it pending until every stage clears) — show the record's real status,
      // not the action we just took.
      let updated = null;
      try {
        updated = await leaveService.get(r.id);
      } catch {
        /* keep the optimistic fallback below */
      }
      const status = updated?.status || (isApprove ? "approved" : "rejected");
      patchLocal(r.id, updated || { status });
      if (String(status).toLowerCase().startsWith("pend")) {
        toast.success(
          `${isApprove ? "Approval" : "Rejection"} recorded — awaiting the remaining approval stages.`
        );
      } else {
        toast.success(isApprove ? "Leave approved." : "Leave rejected.");
      }
    } catch (err) {
      toast.error(err?.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const remind = async (r) => {
    setBusyId(r.id);
    try {
      await leaveService.remind(r.id);
      toast.success("Reminder sent to the approver.");
    } catch (err) {
      toast.error(err?.message || "Couldn't send the reminder.");
    } finally {
      setBusyId(null);
    }
  };

  // NOTE: deletion is deliberately absent here — the backend only lets the
  // OWNER cancel their own pending request (a soft-cancel), so an admin
  // delete button can never succeed. Owners cancel from Self-service → Leave.

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Leave Engine</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Leave Administration</h1>
          <p className="mt-1 text-sm text-ink-muted">Every leave request in the organization — review, action, and keep coverage in view.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowPeriods((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-sunken"
          >
            <CalendarClock className="h-4 w-4" />
            {showPeriods ? "Hide periods" : "Manage periods"}
          </button>
        )}
      </div>

      {isAdmin && Array.isArray(periods) && !activePeriod && (
        <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <span className="font-semibold">No administration period is open</span> — employees can't
            submit leave requests until one covers their dates. Open or schedule a period under
            “Manage periods”.
          </span>
        </div>
      )}

      {isAdmin && showPeriods && (
        <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
            <div>
              <h3 className="font-semibold text-ink">Administration periods</h3>
              <p className="text-xs text-ink-muted">
                Leave requests must fall inside one period; day budgets reset each period. Periods
                can't overlap and complete themselves when their end date passes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeriodModal({ mode: "schedule" })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-sunken"
              >
                <CalendarClock className="h-3.5 w-3.5" /> Schedule period
              </button>
              <button
                onClick={() => setPeriodModal({ mode: "open" })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
              >
                <Plus className="h-3.5 w-3.5" /> Open period now
              </button>
            </div>
          </div>
          {!Array.isArray(periods) ? (
            <div className="p-8 text-center text-xs text-ink-muted">Loading periods…</div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-faint">
              No periods yet — open one to unblock leave requests.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-sunken/60 text-[10px] uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Window</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id} className="border-t border-line-soft">
                      <td className="px-4 py-2.5 font-medium text-ink">{p.name || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-2">
                        {periodDate(p.start_date)} → {periodDate(p.end_date)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : p.status === "scheduled"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-sunken text-ink-muted"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-muted">{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Summary chips */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Pending requests", counts.pending, counts.pending > 0],
          ["Approved (total)", counts.approved, false],
          ["On leave today", counts.onLeaveToday, false],
        ].map(([label, value, attention]) => (
          <div key={label} className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
            <div className={`text-2xl font-bold tracking-tight ${attention ? "text-amber-600" : "text-ink"}`}>{value}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-line-soft p-4">
          <TabPills layoutId="leave-tab" active={tab} onChange={setTab} tabs={STATUS_TABS} />
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by employee, type, or reason…"
              className="w-full bg-transparent outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading leave requests…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto h-12 w-12 text-ink-ghost" />
            <h3 className="mt-4 text-sm font-semibold text-ink">No {tab === "all" ? "" : tab + " "}leave requests</h3>
            <p className="mt-1 text-xs text-ink-muted">Requests submitted from the self-service portal appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Dates</th>
                  <th className="px-4 py-3 text-left font-semibold">Days</th>
                  <th className="px-4 py-3 text-left font-semibold">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const s = statusOf(r);
                  const pending = s.startsWith("pend");
                  return (
                    <tr key={r.id} className={`border-t border-line-soft ${busyId === r.id ? "opacity-50 pointer-events-none" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-ink">{requesterName(r)}</td>
                      <td className="px-4 py-3 text-ink-2">{typeName(r)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</td>
                      <td className="px-4 py-3 text-ink-2">{inclusiveDays(r.start_date, r.end_date) || "—"}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-ink-muted">{r.reason || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadgeCls(s)}`}>
                          {s.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {pending && canManage && (
                            <>
                              <button onClick={() => act(r, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button onClick={() => act(r, "reject")} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600">
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {pending && (
                            <button onClick={() => remind(r)} title="Send reminder to approver" className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-brand">
                              <BellRing className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {periodModal && (
        <PeriodModal
          mode={periodModal.mode}
          onClose={() => setPeriodModal(null)}
          onSaved={async () => {
            setPeriodModal(null);
            setShowPeriods(true);
            await loadPeriods();
          }}
        />
      )}
    </div>
  );
};

// Create an administration period. 'open' starts today (backend fixes the
// start date server-side, so only the end is asked for); 'schedule' takes a
// full range and the backend activates it immediately if it covers today.
// Overlap and past-date rules are enforced server-side — errors show inline.
function PeriodModal({ mode, onClose, onSaved }) {
  const toast = useToast();
  const opening = mode === "open";
  const today = new Date().toLocaleDateString("en-CA");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const labelCls = "text-xs font-semibold text-ink-muted uppercase tracking-wider";
  const inputCls = "w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1 focus:border-brand";

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!endDate) return setError("Pick an end date for the period.");
    if (!opening && startDate > endDate) return setError("The start date must be on or before the end date.");
    if (opening && endDate < today) return setError("The end date must be today or later.");
    setError("");
    setBusy(true);
    try {
      if (opening) {
        await administrationPeriodService.openNow({ name: name.trim(), end_date: endDate });
        toast.success("Period opened — leave requests are unblocked.");
      } else {
        await administrationPeriodService.schedule({ name: name.trim(), start_date: startDate, end_date: endDate });
        toast.success("Period scheduled.");
      }
      onSaved?.();
    } catch (err) {
      console.error("[LeaveAdmin] Period save failed:", err);
      setError(err?.error?.message || err?.message || "Couldn't save the period.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">{opening ? "Open a period from today" : "Schedule a period"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div>
            <label className={labelCls}>Name (optional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. H2 2026 leave window" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start date</label>
              {opening ? (
                <input value={today} disabled className={`${inputCls} opacity-60`} />
              ) : (
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} required />
              )}
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <input type="date" value={endDate} min={opening ? today : startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={inputCls} required />
            </div>
          </div>
          <p className="text-xs text-ink-faint">
            Periods can't overlap an existing one. Once the end date passes, the period completes
            automatically and leave requests need a new window.
          </p>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={busy} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {busy ? "Saving…" : opening ? "Open period" : "Schedule period"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LeaveAdminPage;
