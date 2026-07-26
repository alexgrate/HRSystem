import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  UserCircle,
  Users,
  Repeat,
  Gauge,
  BarChart3,
  Plus,
  Check,
  X,
  Lock,
  Pencil,
  Trash2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { TabPills } from "../../components/ui/TabPills";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { usePermissions } from "../../context/PermissionContext";
import { useAuth } from "../../context/AuthContext";
import { getEmployeeName } from "../../utils/employee";
import {
  performanceIndicatorService,
  appraisalCycleService,
  appraisalCycleLifecycleService,
  appraisalReviewService,
  appraisalSessionService,
} from "../../services/appraisalService";
import { administrationPeriodService } from "../../services/administrationPeriodService";
import { setupService } from "../../services/setupService";
import { orgService } from "../../services/orgService";
import { ReviewDetailModal } from "../../components/appraisal/EmployeeAppraisal";

/* ------------------------------------------------------------------ helpers */

const errMsg = (err, fallback) => err?.error?.message || err?.message || fallback;

const fmtNum = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const pct = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
};

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

// Appraisal-specific status chips. The shared statusBadgeCls only knows
// approve/reject/cancel; here 'submitted'/'completed' are the positive states.
const apStatusCls = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed" || s === "submitted" || s === "locked") return "bg-emerald-50 text-emerald-700";
  if (s === "in_progress" || s === "draft" || s === "unlocked") return "bg-amber-50 text-amber-700";
  return "bg-sunken text-ink-muted";
};

const StatusChip = ({ status, label }) => (
  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${apStatusCls(status)}`}>
    {String(label ?? status ?? "—").replace(/_/g, " ")}
  </span>
);

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-line/80 bg-card shadow-sm ${className}`}>{children}</div>
);

const Loading = ({ label = "Loading…" }) => (
  <div className="p-12 text-center text-sm text-ink-muted">{label}</div>
);

const EmptyState = ({ Icon = ClipboardCheck, title, hint }) => (
  <div className="p-12 text-center">
    <Icon className="mx-auto h-12 w-12 text-ink-ghost" />
    <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
    {hint ? <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">{hint}</p> : null}
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="p-12 text-center">
    <AlertCircle className="mx-auto h-12 w-12 text-red-300" />
    <h3 className="mt-4 text-sm font-semibold text-ink">Something went wrong</h3>
    <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">{message}</p>
    {onRetry ? (
      <button onClick={onRetry} className="mt-4 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken">
        Retry
      </button>
    ) : null}
  </div>
);

const inputCls =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Modal({ title, subtitle, onClose, children, maxW = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className={`w-full ${maxW} rounded-2xl bg-card p-6 shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-ink">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const PrimaryBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const GhostBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-sunken disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

/* ============================================================== main page */

const AppraisalPage = () => {
  const { isAdmin, ready } = usePermissions();
  const { user } = useAuth();
  const myEmployeeId = user?.id || null;

  const [departments, setDepartments] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const [depts, dir, cycle, cycleList] = await Promise.all([
          setupService.getDepartments().then((r) => (Array.isArray(r) ? r : r?.departments || [])).catch(() => []),
          orgService.listDirectory().catch(() => []),
          appraisalCycleService.current().catch(() => null),
          appraisalCycleService.list().catch(() => []),
        ]);
        if (stale) return;
        setDepartments(Array.isArray(depts) ? depts : []);
        setDirectory(Array.isArray(dir) ? dir : []);
        setCurrentCycle(cycle || null);
        setCycles(Array.isArray(cycleList) ? cycleList : []);
      } finally {
        if (!stale) setBootLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const headedDeptIds = useMemo(
    () => departments.filter((d) => d.head_employee_id && d.head_employee_id === myEmployeeId).map((d) => d.id),
    [departments, myEmployeeId]
  );
  // Direct reports (line-manager relationship) — the backend authorizes a
  // manager to review these even without a department-head role.
  const managedEmployeeIds = useMemo(
    () => directory.filter((p) => p.manager_id && p.manager_id === myEmployeeId).map((p) => p.id),
    [directory, myEmployeeId]
  );
  // A user designated as the reviewer for some active/reviewing cycle
  // (reviewer_assignment_type 'hr'/'specific_employee') is backend-authorized to
  // review even if they manage no one and head no department — so they need the
  // Team Reviews tab too.
  const isDesignatedReviewer = useMemo(
    () =>
      cycles.some(
        (c) =>
          c.reviewer_employee_id &&
          c.reviewer_employee_id === myEmployeeId &&
          (c.status === "active" || c.status === "reviewing")
      ),
    [cycles, myEmployeeId]
  );
  const isDeptHead = headedDeptIds.length > 0;
  const isManager = managedEmployeeIds.length > 0;
  // Opening cycles, calling up reviews, and lifecycle transitions are admin-only.
  // Department heads reach the Cycles tab too, but only to manage their own
  // department's per-cycle indicator selection (backend allows head or admin).
  const canViewCycles = isAdmin || isDeptHead;
  const canManageIndicators = isAdmin || isDeptHead;
  const canReviewTeam = isAdmin || isDeptHead || isManager || isDesignatedReviewer;

  // Employee-facing views (My Targets / My Reviews) live on the Self-Service
  // page under the Appraisals tab; this page is the management console.
  const tabs = useMemo(
    () =>
      [
        { key: "team-reviews", label: "Team Reviews", Icon: Users, show: canReviewTeam },
        { key: "cycles", label: "Cycles", Icon: Repeat, show: canViewCycles },
        { key: "indicators", label: "Indicators", Icon: Gauge, show: canManageIndicators },
        { key: "reports", label: "Reports", Icon: BarChart3, show: isAdmin },
      ].filter((t) => t.show),
    [canReviewTeam, canViewCycles, canManageIndicators, isAdmin]
  );

  const [tab, setTab] = useState("team-reviews");
  // Derive the effective tab so capability changes can't strand us on a hidden
  // tab, without a setState-in-effect round-trip.
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key || null;

  if (!user || !ready || bootLoading) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <Loading label="Loading appraisals…" />
        </Card>
      </div>
    );
  }

  // Plain employees have no management role here — their appraisal lives on
  // the Self-Service page.
  if (tabs.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <div className="p-12 text-center">
            <UserCircle className="mx-auto h-12 w-12 text-ink-ghost" />
            <h3 className="mt-4 text-sm font-semibold text-ink">Your appraisal is in Self-Service</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
              Set your targets and record your review results under{" "}
              <Link to="/app/self-service" className="font-semibold text-brand hover:underline">
                Self-Service Portal → Appraisals
              </Link>
              . This page is for reviewers, department heads, and administrators.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const shared = {
    myEmployeeId,
    isAdmin,
    departments,
    directory,
    headedDeptIds,
    managedEmployeeIds,
    currentCycle,
  };

  return (
    <div className="space-y-6">
      <Header />
      <TabPills layoutId="appraisal-tab" active={activeTab} onChange={setTab} tabs={tabs} />

      {activeTab === "team-reviews" && canReviewTeam && <TeamReviewsSection {...shared} />}
      {activeTab === "cycles" && canViewCycles && <CyclesSection {...shared} />}
      {activeTab === "indicators" && canManageIndicators && <IndicatorsSection {...shared} />}
      {activeTab === "reports" && isAdmin && <ReportsSection {...shared} />}
    </div>
  );
};

const Header = () => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wider text-brand">Performance</div>
    <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Appraisals</h1>
    <p className="mt-1 text-sm text-ink-muted">
      Run appraisal cycles, manage indicators and target locks, oversee team reviews, and report on results.
      Employees set targets and rate themselves under Self-Service → Appraisals.
    </p>
  </div>
);

/* ============================================================ Team Reviews */

function TeamReviewsSection({ myEmployeeId, isAdmin, headedDeptIds, managedEmployeeIds = [], currentCycle }) {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [callUpOpen, setCallUpOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await appraisalReviewService.list();
      const list = Array.isArray(rows) ? rows : [];
      // Admin sees all; reviewers see the ones they own. list() already scopes
      // non-admins to reviews they're involved in, so filter to reviewer role.
      const mine = isAdmin ? list : list.filter((r) => r.reviewer_employee_id === myEmployeeId);
      setReviews(mine);
    } catch (err) {
      setError(errMsg(err, "Failed to load team reviews."));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, myEmployeeId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Team Reviews</h2>
            <p className="text-xs text-ink-muted">Call up, score, and complete reviews for your team.</p>
          </div>
          <PrimaryBtn onClick={() => setCallUpOpen(true)}>
            <Plus className="h-4 w-4" /> Call up review
          </PrimaryBtn>
        </div>

        {loading ? (
          <Loading label="Loading reviews…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : reviews.length === 0 ? (
          <EmptyState Icon={Users} title="No reviews yet" hint="Call up a review for an employee who has submitted their targets for the current cycle." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Overall</th>
                  <th className="px-4 py-3 text-left font-semibold">Reviewed</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-t border-line-soft">
                    <td className="px-5 py-3 text-ink">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.employee_name || r.employee_id.slice(0, 8)}</span>
                        {r.session_type === "final" && (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">Final</span>
                        )}
                      </div>
                      {(r.session_name || r.cycle_name) && (
                        <div className="text-xs text-ink-faint">{[r.session_name, r.cycle_name].filter(Boolean).join(" · ")}</div>
                      )}
                      {r.reviewer_name && <div className="text-xs text-ink-faint">Reviewer: {r.reviewer_name}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                    <td className="px-4 py-3 font-semibold text-ink">{r.overall_rating != null ? pct(r.overall_rating) : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmtDate(r.reviewed_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <GhostBtn onClick={() => setOpenId(r.id)}>
                        {r.status === "in_progress" ? "Score" : "View"} <ChevronRight className="h-3.5 w-3.5" />
                      </GhostBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {callUpOpen && (
        <CallUpModal
          isAdmin={isAdmin}
          myEmployeeId={myEmployeeId}
          headedDeptIds={headedDeptIds}
          managedEmployeeIds={managedEmployeeIds}
          defaultCycle={currentCycle}
          onClose={() => setCallUpOpen(false)}
          onDone={(newId) => {
            setCallUpOpen(false);
            load();
            if (newId) setOpenId(newId);
          }}
          onToast={toast}
        />
      )}

      {openId && <ReviewDetailModal reviewId={openId} editable onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function CallUpModal({ isAdmin, myEmployeeId, headedDeptIds, managedEmployeeIds = [], defaultCycle, onClose, onDone, onToast }) {
  const [cycles, setCycles] = useState([]);
  const [dir, setDir] = useState([]);
  const [cycleId, setCycleId] = useState(
    defaultCycle && (defaultCycle.status === "active" || defaultCycle.status === "reviewing") ? defaultCycle.id : ""
  );
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const [cyc, people] = await Promise.all([
          appraisalCycleService.list().catch(() => []),
          orgService.listDirectory().catch(() => []),
        ]);
        if (stale) return;
        setCycles(Array.isArray(cyc) ? cyc : []);
        setDir(Array.isArray(people) ? people : []);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  // Only cycles that actually accept call-ups are selectable (backend rejects
  // draft/closed/archived).
  const selectableCycles = useMemo(
    () => cycles.filter((c) => c.status === "active" || c.status === "reviewing"),
    [cycles]
  );
  const selectedCycle = useMemo(() => cycles.find((c) => c.id === cycleId) || null, [cycles, cycleId]);

  // Eligible employees mirror the backend's assertConfiguredReviewer for the
  // chosen cycle's reviewer_assignment_type — so we never offer a call-up the
  // backend would reject, nor hide one it permits.
  const employees = useMemo(() => {
    const people = dir.filter((p) => p.id !== myEmployeeId); // never self
    if (isAdmin) return people;
    if (!selectedCycle) return []; // pick a cycle first — eligibility depends on it
    const type = selectedCycle.reviewer_assignment_type || "relationship";
    const heads = new Set(headedDeptIds);
    const reports = new Set(managedEmployeeIds);
    if (type === "manager") return people.filter((p) => reports.has(p.id));
    if (type === "department_head") return people.filter((p) => heads.has(p.department_id));
    if (type === "specific_employee" || type === "hr")
      return selectedCycle.reviewer_employee_id === myEmployeeId ? people : [];
    // relationship (default): manager OR department head
    return people.filter((p) => heads.has(p.department_id) || reports.has(p.id));
  }, [dir, isAdmin, myEmployeeId, selectedCycle, headedDeptIds, managedEmployeeIds]);

  const submit = async () => {
    setError(null);
    if (!cycleId || !employeeId) {
      setError("Select both a cycle and an employee.");
      return;
    }
    setBusy(true);
    try {
      const created = await appraisalReviewService.callUp({ employee_id: employeeId, appraisal_cycle_id: cycleId });
      onToast.success("Review called up.");
      onDone(created?.id || null);
    } catch (err) {
      setError(errMsg(err, "Failed to call up review."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Call up a review" subtitle="Snapshots the employee's submitted targets into a new review." onClose={onClose}>
      {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      {loading ? (
        <Loading label="Loading…" />
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Appraisal cycle</label>
            <select className={inputCls} value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              <option value="">Select a cycle…</option>
              {selectableCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || fmtDate(c.created_at)} {c.indicators_locked ? "" : "(unlocked)"}
                </option>
              ))}
            </select>
            {selectableCycles.length === 0 ? (
              <p className="mt-1 text-[11px] text-amber-600">No active or reviewing cycle is open for call-ups.</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Employee</label>
            <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!isAdmin && !cycleId}>
              <option value="">{!isAdmin && !cycleId ? "Select a cycle first…" : "Select an employee…"}</option>
              {employees.map((p) => (
                <option key={p.id} value={p.id}>
                  {getEmployeeName(p, p.email || p.id)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ink-faint">
              {!isAdmin && cycleId && employees.length === 0
                ? "You are not the configured reviewer for anyone in this cycle."
                : "The employee must have submitted at least one target for the cycle."}
            </p>
          </div>
        </div>
      )}
      <div className="mt-5 flex items-center justify-end gap-2">
        <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
        <PrimaryBtn onClick={submit} disabled={busy || loading}>{busy ? "Calling up…" : "Call up"}</PrimaryBtn>
      </div>
    </Modal>
  );
}

/* ============================================================ Reports (admin) */

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-line-soft bg-sunken/30 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="mt-1 text-xl font-bold text-ink">{value}</div>
    </div>
  );
}

function ReportsSection() {
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stale = false;
    appraisalCycleService
      .list()
      .then((rows) => { if (!stale) setCycles(Array.isArray(rows) ? rows : []); })
      .catch(() => {});
    return () => { stale = true; };
  }, []);

  const [results, setResults] = useState([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await appraisalReviewService.report(cycleId || undefined);
      setReport(res?.data || res);
      if (cycleId) {
        const rows = await appraisalSessionService.results(cycleId).catch(() => []);
        setResults(Array.isArray(rows) ? rows : []);
      } else {
        setResults([]);
      }
    } catch (err) {
      setError(errMsg(err, "Failed to load report."));
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const byStatus = report?.by_status || {};
  const stat = (k) => byStatus[k] || 0;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <h2 className="text-sm font-bold text-ink">Appraisal report</h2>
        <select className={`${inputCls} max-w-xs`} value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
          <option value="">All cycles</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.name || `Cycle ${c.id.slice(0, 8)}`}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="p-5"><Loading label="Loading report…" /></div>
      ) : error ? (
        <div className="p-5"><ErrorState message={error} onRetry={loadReport} /></div>
      ) : report ? (
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Total reviews" value={report.total_reviews} />
            <Metric label="Completion" value={`${report.completion_percentage ?? 0}%`} />
            <Metric label="Outstanding" value={report.outstanding_reviews ?? 0} />
            <Metric label="Average score" value={report.average_score != null ? `${report.average_score}%` : "—"} />
            <Metric label="Completed" value={report.completed_reviews ?? 0} />
            <Metric label="Published" value={stat("published")} />
            <Metric label="Acknowledged" value={stat("acknowledged")} />
            <Metric label="Appeals" value={report.appeals_total ?? 0} />
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Status distribution</div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(byStatus).length ? (
                Object.entries(byStatus).map(([s, c]) => (
                  <StatusChip key={s} status={s} label={`${s.replace(/_/g, " ")}: ${c}`} />
                ))
              ) : (
                <span className="text-sm text-ink-faint">No reviews yet.</span>
              )}
            </div>
          </div>

          {cycleId && results.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Final appraisal results
              </div>
              <div className="overflow-x-auto rounded-xl border border-line-soft">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Employee</th>
                      <th className="px-4 py-2 text-left font-semibold">Department</th>
                      <th className="px-4 py-2 text-left font-semibold">Final review</th>
                      <th className="px-4 py-2 text-left font-semibold">Overall (main)</th>
                      <th className="px-4 py-2 text-left font-semibold">Reviews counted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id || r.employee_id} className="border-t border-line-soft">
                        <td className="px-4 py-2 font-medium text-ink">{r.employee_name || r.employee_id.slice(0, 8)}</td>
                        <td className="px-4 py-2 text-ink-muted">{r.department_name || "—"}</td>
                        <td className="px-4 py-2 text-ink-muted">{r.final_rating != null ? pct(r.final_rating) : "—"}</td>
                        <td className="px-4 py-2 font-semibold text-ink">{r.overall_rating != null ? pct(r.overall_rating) : "—"}</td>
                        <td className="px-4 py-2 text-ink-muted">{r.sessions_counted ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Department breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Department</th>
                    <th className="px-4 py-2 text-left font-semibold">Reviews</th>
                    <th className="px-4 py-2 text-left font-semibold">Average score</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.department_averages || []).length ? (
                    report.department_averages.map((d, i) => (
                      <tr key={i} className="border-t border-line-soft">
                        <td className="px-4 py-2 text-ink">{d.department_name || "—"}</td>
                        <td className="px-4 py-2 text-ink-muted">{d.count}</td>
                        <td className="px-4 py-2 font-semibold text-ink">{d.average_score != null ? `${d.average_score}%` : "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-faint">No data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/* ============================================================ Cycles (admin) */

function CyclesSection({ directory = [], isAdmin = false, headedDeptIds = [] }) {
  const toast = useToast();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await appraisalCycleService.list();
      setCycles(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(errMsg(err, "Failed to load cycles."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (detailId) {
    return <CycleDetail cycleId={detailId} directory={directory} isAdmin={isAdmin} headedDeptIds={headedDeptIds} onBack={() => { setDetailId(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Appraisal Cycles</h2>
            <p className="text-xs text-ink-muted">
              {isAdmin
                ? "Start the appraisal for an administration period, call up reviews during it, and end it with the final review."
                : "Select your department's performance indicators, follow your team's target progress, and lock in targets when everyone has submitted."}
            </p>
          </div>
          {/* Opening/locking a cycle is admin-only; a department head only manages its indicator selection. */}
          {isAdmin && (
            <PrimaryBtn onClick={() => setOpenModal(true)}>
              <Plus className="h-4 w-4" /> Open cycle
            </PrimaryBtn>
          )}
        </div>

        {loading ? (
          <Loading label="Loading cycles…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : cycles.length === 0 ? (
          <EmptyState Icon={Repeat} title="No appraisal cycles" hint="Open a cycle for the current administration period to begin the appraisal process." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Cycle</th>
                  <th className="px-4 py-3 text-left font-semibold">Lifecycle</th>
                  <th className="px-4 py-3 text-left font-semibold">Indicators</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c.id} className="border-t border-line-soft">
                    <td className="px-5 py-3 font-semibold text-ink">{c.name || `Cycle ${c.id.slice(0, 8)}`}</td>
                    <td className="px-4 py-3"><StatusChip status={c.status || "draft"} label={(c.status || "draft").replace(/^\w/, (m) => m.toUpperCase())} /></td>
                    <td className="px-4 py-3">
                      <StatusChip status={c.indicators_locked ? "locked" : "unlocked"} label={c.indicators_locked ? "Locked" : "Open"} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <GhostBtn onClick={() => setDetailId(c.id)}>
                        Manage <ChevronRight className="h-3.5 w-3.5" />
                      </GhostBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openModal && (
        <OpenCycleModal
          onClose={() => setOpenModal(false)}
          onDone={() => {
            setOpenModal(false);
            load();
          }}
          onToast={toast}
        />
      )}
    </div>
  );
}

function OpenCycleModal({ onClose, onDone, onToast }) {
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const rows = await administrationPeriodService.list().catch(() => []);
        if (!stale) setPeriods(Array.isArray(rows) ? rows : []);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const submit = async () => {
    setError(null);
    if (!periodId) {
      setError("Select an administration period.");
      return;
    }
    setBusy(true);
    try {
      await appraisalCycleService.open({ administration_period_id: periodId, name: name || undefined });
      onToast.success("Appraisal cycle opened.");
      onDone();
    } catch (err) {
      setError(errMsg(err, "Failed to open cycle."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Open appraisal cycle" subtitle="One cycle can exist per administration period." onClose={onClose}>
      {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      {loading ? (
        <Loading label="Loading periods…" />
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Administration period</label>
            <select className={inputCls} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">Select a period…</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `${fmtDate(p.start_date)} – ${fmtDate(p.end_date)}`} ({p.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Cycle name (optional)</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FY25 Annual Appraisal" />
          </div>
        </div>
      )}
      <div className="mt-5 flex items-center justify-end gap-2">
        <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
        <PrimaryBtn onClick={submit} disabled={busy || loading}>{busy ? "Opening…" : "Open cycle"}</PrimaryBtn>
      </div>
    </Modal>
  );
}

function CycleDetail({ cycleId, directory = [], isAdmin = false, headedDeptIds = [], onBack }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [cycle, setCycle] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selLoading, setSelLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [locking, setLocking] = useState(false);
  const [savingRa, setSavingRa] = useState(false);
  const [raType, setRaType] = useState("relationship");
  const [raReviewer, setRaReviewer] = useState("");
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  const loadCycle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, depts, roles, cat, sess] = await Promise.all([
        appraisalCycleService.get(cycleId),
        setupService.getDepartments().then((r) => (Array.isArray(r) ? r : r?.departments || [])).catch(() => []),
        setupService.getJobRoles().then((r) => (Array.isArray(r) ? r : r?.jobRoles || r?.job_roles || [])).catch(() => []),
        performanceIndicatorService.list().catch(() => []),
        appraisalSessionService.list(cycleId).catch(() => []),
      ]);
      setCycle(c);
      setDepartments(Array.isArray(depts) ? depts : []);
      setJobRoles(Array.isArray(roles) ? roles : []);
      setCatalog(Array.isArray(cat) ? cat : []);
      setSessions(Array.isArray(sess) ? sess : []);
    } catch (err) {
      setError(errMsg(err, "Failed to load cycle."));
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  const reloadSessionsAndCycle = useCallback(async () => {
    const [c, sess] = await Promise.all([
      appraisalCycleService.get(cycleId).catch(() => null),
      appraisalSessionService.list(cycleId).catch(() => []),
    ]);
    if (c) setCycle(c);
    setSessions(Array.isArray(sess) ? sess : []);
  }, [cycleId]);

  // Target progress for the selected department (dept head or admin view).
  const canSeeProgress = isAdmin || headedDeptIds.includes(deptId);
  const loadProgress = useCallback(async () => {
    if (!deptId || !canSeeProgress) {
      setProgress(null);
      return;
    }
    setProgressLoading(true);
    try {
      const res = await appraisalCycleService.targetProgress(cycleId, deptId);
      setProgress(res?.data || res || null);
    } catch {
      setProgress(null);
    } finally {
      setProgressLoading(false);
    }
  }, [cycleId, deptId, canSeeProgress]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const loadSelections = useCallback(async () => {
    if (!deptId) {
      setSelections([]);
      return;
    }
    setSelLoading(true);
    try {
      const rows = await appraisalCycleService.listDepartmentIndicators(cycleId, deptId);
      setSelections(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load department indicators."));
    } finally {
      setSelLoading(false);
    }
  }, [cycleId, deptId, toast]);

  useEffect(() => {
    loadSelections();
  }, [loadSelections]);

  // Keep the local reviewer-assignment selection in step with the persisted
  // cycle (after load and after each successful save, which calls setCycle).
  useEffect(() => {
    if (cycle) {
      setRaType(cycle.reviewer_assignment_type || "relationship");
      setRaReviewer(cycle.reviewer_employee_id || "");
    }
  }, [cycle]);

  const locked = !!cycle?.indicators_locked;

  const lock = async () => {
    const ok = await confirm({
      title: "Lock indicators?",
      message: "Once locked, department indicators can no longer be added or removed for this cycle, and employees can begin setting targets. This cannot be undone.",
      confirmLabel: "Lock indicators",
      danger: true,
    });
    if (!ok) return;
    setLocking(true);
    try {
      const updated = await appraisalCycleService.lockIndicators(cycleId);
      setCycle(updated);
      toast.success("Indicators locked.");
    } catch (err) {
      toast.error(errMsg(err, "Failed to lock indicators."));
    } finally {
      setLocking(false);
    }
  };

  // Mirror the backend CYCLE_TRANSITIONS map, including its controlled reopen
  // edges (reviewing->active, closed->active). draft->active is omitted here
  // because locking indicators auto-promotes draft to active.
  const NEXT_STATUS = { draft: [], active: ["reviewing", "closed"], reviewing: ["active", "closed"], closed: ["archived", "active"], archived: [] };
  const transition = async (status) => {
    const ok = await confirm({
      title: `Move cycle to "${status}"?`,
      message:
        status === "closed"
          ? "Closing freezes the cycle: no more target or review edits."
          : status === "archived"
            ? "Archiving makes the cycle read-only forever."
            : status === "active"
              ? "Reopening returns the cycle to active so reviews (and, from draft-lock, targets) can be edited again."
              : `The cycle will move to ${status}.`,
      confirmLabel: "Confirm",
      danger: status === "closed" || status === "archived",
    });
    if (!ok) return;
    try {
      const updated = await appraisalCycleLifecycleService.transition(cycleId, status);
      setCycle(updated?.data || updated);
      toast.success(`Cycle moved to ${status}.`);
    } catch (err) {
      toast.error(errMsg(err, "Failed to change cycle status."));
    }
  };

  const saveReviewerAssignment = async (type, reviewerId) => {
    setSavingRa(true);
    try {
      const updated = await appraisalCycleLifecycleService.setReviewerAssignment(cycleId, {
        reviewer_assignment_type: type,
        reviewer_employee_id: reviewerId || null,
      });
      setCycle(updated?.data || updated);
      toast.success("Reviewer assignment updated.");
    } catch (err) {
      toast.error(errMsg(err, "Failed to update reviewer assignment."));
    } finally {
      setSavingRa(false);
    }
  };

  const openSession = sessions.find((s) => s.status === "open") || null;
  const hasFinal = sessions.some((s) => s.session_type === "final");

  const callUpSession = async (type) => {
    const isFinal = type === "final";
    const ok = await confirm({
      title: isFinal ? "Call up the final review?" : "Call up a performance review?",
      message: isFinal
        ? "Every employee with locked-in targets gets a final self-assessment against their targets. Closing this final review computes each employee's final and overall rating and closes the appraisal for this period."
        : "Every employee with locked-in targets gets a review to record what they have achieved so far against their targets. Targets stay frozen while the review is open.",
      confirmLabel: isFinal ? "Call up final review" : "Call up review",
      danger: isFinal,
    });
    if (!ok) return;
    setSessionBusy(true);
    try {
      const res = await appraisalSessionService.open({ appraisal_cycle_id: cycleId, session_type: type });
      const created = res?.reviews_created ?? res?.data?.reviews_created;
      toast.success(
        created != null
          ? `Review called up — ${created} employee review${created === 1 ? "" : "s"} generated.`
          : "Review called up."
      );
      await reloadSessionsAndCycle();
    } catch (err) {
      toast.error(errMsg(err, "Failed to call up the review."));
    } finally {
      setSessionBusy(false);
    }
  };

  const closeSessionAction = async (session) => {
    const isFinal = session.session_type === "final";
    const ok = await confirm({
      title: isFinal ? "Close the final review?" : "Close this review session?",
      message: isFinal
        ? "This finalizes the appraisal for the administration period: every fully-entered review is completed, each employee's final and overall (main) rating is computed, and the cycle is closed. This cannot be undone."
        : "Employees will no longer be able to enter or change results for this review. The cycle returns to active so targets and future reviews can continue.",
      confirmLabel: isFinal ? "Close final review" : "Close session",
      danger: isFinal,
    });
    if (!ok) return;
    setSessionBusy(true);
    try {
      await appraisalSessionService.close(session.id);
      toast.success(isFinal ? "Final review closed — appraisal results computed." : "Review session closed.");
      await reloadSessionsAndCycle();
    } catch (err) {
      toast.error(errMsg(err, "Failed to close the review session."));
    } finally {
      setSessionBusy(false);
    }
  };

  const lockTargets = async () => {
    const notReady = (progress?.employees || []).filter((e) => !e.ready);
    const ok = await confirm({
      title: "Lock in department targets?",
      message:
        (notReady.length > 0
          ? `${notReady.length} employee${notReady.length === 1 ? " has" : "s have"} not submitted all their targets yet. `
          : "") +
        "Locking freezes every target in this department for the cycle and makes the department eligible for performance reviews. Only an administrator can unlock.",
      confirmLabel: "Lock targets",
      danger: true,
    });
    if (!ok) return;
    setLockBusy(true);
    try {
      await appraisalCycleService.lockDepartmentTargets(cycleId, deptId);
      toast.success("Department targets locked in.");
      await loadProgress();
    } catch (err) {
      toast.error(errMsg(err, "Failed to lock department targets."));
    } finally {
      setLockBusy(false);
    }
  };

  const unlockTargets = async () => {
    const ok = await confirm({
      title: "Unlock department targets?",
      message: "Employees in this department will be able to add and change targets again. Not possible while a review session is open.",
      confirmLabel: "Unlock",
      danger: true,
    });
    if (!ok) return;
    setLockBusy(true);
    try {
      await appraisalCycleService.unlockDepartmentTargets(cycleId, deptId);
      toast.success("Department targets unlocked.");
      await loadProgress();
    } catch (err) {
      toast.error(errMsg(err, "Failed to unlock department targets."));
    } finally {
      setLockBusy(false);
    }
  };

  const removeSelection = async (sel) => {
    const ok = await confirm({
      title: "Remove indicator?",
      message: `Remove "${sel.performance_indicator_name || "this indicator"}" from the department selection?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await appraisalCycleService.removeDepartmentIndicator(cycleId, deptId, sel.id);
      setSelections((p) => p.filter((s) => s.id !== sel.id));
      toast.success("Indicator removed.");
    } catch (err) {
      toast.error(errMsg(err, "Failed to remove indicator."));
    }
  };

  if (loading) {
    return (
      <Card>
        <Loading label="Loading cycle…" />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={loadCycle} />
      </Card>
    );
  }

  const deptRoles = jobRoles.filter((r) => !deptId || r.department_id === deptId);
  // A department head may manage indicator selections only for departments they
  // head (the backend enforces the same via assertDepartmentHeadOrAdmin); an
  // admin sees them all.
  const visibleDepartments = isAdmin ? departments : departments.filter((d) => headedDeptIds.includes(d.id));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs font-semibold text-brand hover:underline">← Back to cycles</button>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">{cycle.name || `Cycle ${cycle.id.slice(0, 8)}`}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusChip status={cycle.status || "draft"} label={`Lifecycle: ${(cycle.status || "draft").replace(/^\w/, (m) => m.toUpperCase())}`} />
              <StatusChip status={locked ? "locked" : "unlocked"} label={locked ? "Indicators locked" : "Open for selection"} />
              {cycle.locked_at ? <span className="text-[11px] text-ink-faint">Locked {fmtDate(cycle.locked_at)}</span> : null}
              {cycle.closed_at ? <span className="text-[11px] text-ink-faint">Closed {fmtDate(cycle.closed_at)}</span> : null}
            </div>
          </div>
          {/* Lock + lifecycle transitions are admin-only (backend gates them on isAdmin). */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {!locked ? (
                <PrimaryBtn onClick={lock} disabled={locking}>
                  <Lock className="h-4 w-4" /> {locking ? "Locking…" : "Lock indicators"}
                </PrimaryBtn>
              ) : null}
              {(NEXT_STATUS[cycle.status || "draft"] || []).map((s) => (
                <GhostBtn key={s} onClick={() => transition(s)}>
                  {s === "reviewing" ? "Start reviewing" : s === "closed" ? "Close cycle" : s === "archived" ? "Archive" : s === "active" ? "Reopen to active" : s}
                </GhostBtn>
              ))}
            </div>
          )}
        </div>

        {isAdmin && cycle.status !== "closed" && cycle.status !== "archived" && (
          <div className="flex flex-wrap items-end gap-3 border-b border-line-soft bg-sunken/20 px-5 py-4">
            <div className="w-full max-w-xs">
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Reviewer assignment</label>
              <select
                className={inputCls}
                value={raType}
                disabled={savingRa}
                onChange={(e) => {
                  const t = e.target.value;
                  setRaType(t);
                  if (t === "specific_employee" || t === "hr") {
                    // Reveal the reviewer picker via local state; only persist
                    // once a reviewer is chosen (backend requires it for these).
                    if (raReviewer) saveReviewerAssignment(t, raReviewer);
                  } else {
                    // relationship / manager / department_head need no reviewer.
                    saveReviewerAssignment(t, null);
                  }
                }}
              >
                <option value="relationship">Relationship (manager or department head)</option>
                <option value="manager">Manager only</option>
                <option value="department_head">Department head only</option>
                <option value="hr">HR (a designated employee)</option>
                <option value="specific_employee">Specific employee</option>
              </select>
            </div>
            {(raType === "specific_employee" || raType === "hr") && (
              <div className="w-full max-w-xs">
                <label className="mb-1 block text-xs font-semibold text-ink-muted">Designated reviewer</label>
                <select
                  className={inputCls}
                  value={raReviewer}
                  disabled={savingRa}
                  onChange={(e) => {
                    const rid = e.target.value;
                    setRaReviewer(rid);
                    if (rid) saveReviewerAssignment(raType, rid);
                  }}
                >
                  <option value="">Select an employee…</option>
                  {directory.map((p) => (
                    <option key={p.id} value={p.id}>{getEmployeeName(p, p.email)}</option>
                  ))}
                </select>
              </div>
            )}
            <p className="w-full text-[11px] text-ink-faint">
              Controls who may review employees in this cycle. Admins can always review.
              {(raType === "specific_employee" || raType === "hr") && !raReviewer
                ? " Choose a designated reviewer to apply this assignment."
                : ""}
            </p>
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-full max-w-xs">
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Department</label>
              <select className={inputCls} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                <option value="">Select a department…</option>
                {visibleDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            {deptId && !locked && !progress?.locked ? (
              <PrimaryBtn onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add indicator
              </PrimaryBtn>
            ) : null}
          </div>

          <div className="mt-4">
            {!deptId ? (
              <p className="py-8 text-center text-xs text-ink-muted">Select a department to view and manage its performance indicators.</p>
            ) : selLoading ? (
              <Loading label="Loading indicators…" />
            ) : selections.length === 0 ? (
              <EmptyState Icon={Gauge} title="No indicators selected" hint={locked ? "This department has no indicators and the cycle is locked." : "Add performance indicators for this department."} />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line-soft">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Indicator</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Job role</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Weight</th>
                      {!locked && !progress?.locked ? <th className="px-3 py-2.5" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {selections.map((s) => (
                      <tr key={s.id} className="border-t border-line-soft">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{s.performance_indicator_name || "Indicator"}</div>
                          {s.measurement_unit ? <div className="text-[11px] text-ink-faint">Unit: {s.measurement_unit}</div> : null}
                        </td>
                        <td className="px-3 py-3 text-ink-muted">
                          {s.job_role_id ? jobRoles.find((r) => r.id === s.job_role_id)?.title || "Role" : "All roles"}
                        </td>
                        <td className="px-3 py-3 text-ink-muted">{fmtNum(s.weight)}</td>
                        {!locked && !progress?.locked ? (
                          <td className="px-3 py-3 text-right">
                            <GhostBtn onClick={() => removeSelection(s)} className="border-red-200 text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </GhostBtn>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {deptId && canSeeProgress && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-ink">Target progress</h3>
                  <p className="text-xs text-ink-muted">
                    Each employee's submitted targets against the indicators that apply to their job role.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {progress?.locked ? (
                    <>
                      <StatusChip status="locked" label={`Targets locked ${progress.lock?.locked_at ? fmtDate(progress.lock.locked_at) : ""}`} />
                      {isAdmin && (
                        <GhostBtn onClick={unlockTargets} disabled={lockBusy} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                          Unlock
                        </GhostBtn>
                      )}
                    </>
                  ) : (
                    <PrimaryBtn onClick={lockTargets} disabled={lockBusy || progressLoading}>
                      <Lock className="h-4 w-4" /> {lockBusy ? "Locking…" : "Lock in targets"}
                    </PrimaryBtn>
                  )}
                </div>
              </div>

              {progressLoading ? (
                <Loading label="Loading target progress…" />
              ) : !progress ? (
                <p className="py-6 text-center text-xs text-ink-muted">Target progress is unavailable for this department.</p>
              ) : (progress.employees || []).length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-muted">No employees found in this department.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-line-soft">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Employee</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Applicable indicators</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Targets set</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Submitted</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Ready</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progress.employees.map((e) => (
                        <tr key={e.employee_id} className="border-t border-line-soft">
                          <td className="px-4 py-2.5 font-medium text-ink">{e.employee_name || e.employee_id.slice(0, 8)}</td>
                          <td className="px-3 py-2.5 text-ink-muted">{e.indicators_applicable}</td>
                          <td className="px-3 py-2.5 text-ink-muted">{e.targets_set}</td>
                          <td className="px-3 py-2.5 text-ink-muted">{e.targets_submitted}</td>
                          <td className="px-3 py-2.5">
                            <StatusChip status={e.ready ? "submitted" : "draft"} label={e.ready ? "Ready" : "Pending"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Performance reviews</h2>
            <p className="text-xs text-ink-muted">
              {isAdmin
                ? "Call up a review at any time during the period; the final review ends the appraisal and computes the main ratings."
                : "Reviews the administrator has called up for this cycle."}
            </p>
          </div>
          {isAdmin && !openSession && cycle.status !== "closed" && cycle.status !== "archived" && (
            <div className="flex flex-wrap items-center gap-2">
              <PrimaryBtn onClick={() => callUpSession("interim")} disabled={sessionBusy}>
                <Plus className="h-4 w-4" /> Call up review
              </PrimaryBtn>
              {!hasFinal && (
                <GhostBtn onClick={() => callUpSession("final")} disabled={sessionBusy} className="border-brand/40 text-brand hover:bg-brand/5">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Call up final review
                </GhostBtn>
              )}
            </div>
          )}
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            Icon={ClipboardCheck}
            title="No reviews called up yet"
            hint="Once department heads lock in targets, call up a performance review so employees can record their achievements. The final review closes the appraisal for the period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Review</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold">Opened</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line-soft">
                    <td className="px-5 py-3 font-semibold text-ink">{s.name || "Performance review"}</td>
                    <td className="px-4 py-3">
                      {s.session_type === "final" ? (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">Final</span>
                      ) : (
                        <span className="text-xs text-ink-muted">Interim</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={s.status === "open" ? "in_progress" : "completed"} label={s.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {s.reviews_total != null ? `${s.reviews_completed ?? 0}/${s.reviews_total} submitted` : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{fmtDate(s.opened_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin && s.status === "open" ? (
                        <GhostBtn onClick={() => closeSessionAction(s)} disabled={sessionBusy} className="border-red-200 text-red-600 hover:bg-red-50">
                          {s.session_type === "final" ? "Close final review" : "Close session"}
                        </GhostBtn>
                      ) : (
                        <span className="text-[11px] text-ink-faint">{s.closed_at ? `Closed ${fmtDate(s.closed_at)}` : ""}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {addOpen && (
        <AddIndicatorModal
          catalog={catalog}
          jobRoles={deptRoles}
          onClose={() => setAddOpen(false)}
          onAdd={async ({ performance_indicator_id, job_role_id, weight }) => {
            await appraisalCycleService.addDepartmentIndicator(cycleId, deptId, { performance_indicator_id, job_role_id, weight });
            setAddOpen(false);
            toast.success("Indicator added.");
            loadSelections();
          }}
        />
      )}
    </div>
  );
}

function AddIndicatorModal({ catalog, jobRoles, onClose, onAdd }) {
  const [indicatorId, setIndicatorId] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [weight, setWeight] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (!indicatorId) {
      setError("Select a performance indicator.");
      return;
    }
    const w = Number(weight);
    if (!Number.isFinite(w) || w < 0) {
      setError("Weight must be a non-negative number.");
      return;
    }
    setBusy(true);
    try {
      await onAdd({ performance_indicator_id: indicatorId, job_role_id: jobRoleId || null, weight: w });
    } catch (err) {
      setError(errMsg(err, "Failed to add indicator."));
      setBusy(false);
    }
  };

  return (
    <Modal title="Add department indicator" subtitle="Applies to the whole department, or a specific job role." onClose={onClose}>
      {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Performance indicator</label>
          <select className={inputCls} value={indicatorId} onChange={(e) => setIndicatorId(e.target.value)}>
            <option value="">Select an indicator…</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {catalog.length === 0 ? (
            <p className="mt-1 text-[11px] text-amber-600">No indicators in the catalog yet — create some in the Indicators tab.</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Job role (optional)</label>
          <select className={inputCls} value={jobRoleId} onChange={(e) => setJobRoleId(e.target.value)}>
            <option value="">All roles in the department</option>
            {jobRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Weight</label>
          <input className={inputCls} type="number" min="0" step="any" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
        <PrimaryBtn onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add"}</PrimaryBtn>
      </div>
    </Modal>
  );
}

/* ==================================================== Indicators (catalog) */

function IndicatorsSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null); // indicator or {} for new

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await performanceIndicatorService.list(showInactive);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errMsg(err, "Failed to load indicators."));
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  const deactivate = async (row) => {
    const ok = await confirm({
      title: "Deactivate indicator?",
      message: `"${row.name}" will be hidden from new selections. Existing selections and targets are unaffected.`,
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;
    try {
      await performanceIndicatorService.deactivate(row.id);
      toast.success("Indicator deactivated.");
      load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to deactivate."));
    }
  };

  const reactivate = async (row) => {
    try {
      await performanceIndicatorService.update(row.id, { is_active: true });
      toast.success("Indicator reactivated.");
      load();
    } catch (err) {
      toast.error(errMsg(err, "Failed to reactivate."));
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-ink">Performance Indicators</h2>
          <p className="text-xs text-ink-muted">The organization-wide catalog of KPIs used across appraisal cycles.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          <PrimaryBtn onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" /> New indicator
          </PrimaryBtn>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading indicators…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState Icon={Gauge} title="No performance indicators" hint="Create KPIs like “Sales Volume” or “Tickets Resolved” that can be selected into appraisal cycles." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Unit</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-line-soft ${r.is_active ? "" : "opacity-60"}`}>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">{r.name}</div>
                    {r.description ? <div className="text-xs text-ink-muted">{r.description}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{r.measurement_unit || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={r.is_active ? "submitted" : "inactive"} label={r.is_active ? "Active" : "Inactive"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <GhostBtn onClick={() => setEditing(r)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </GhostBtn>
                      {r.is_active ? (
                        <GhostBtn onClick={() => deactivate(r)} className="border-red-200 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" /> Deactivate
                        </GhostBtn>
                      ) : (
                        <GhostBtn onClick={() => reactivate(r)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          <Check className="h-3.5 w-3.5" /> Reactivate
                        </GhostBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <IndicatorModal
          indicator={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onToast={toast}
        />
      )}
    </Card>
  );
}

function IndicatorModal({ indicator, onClose, onSaved, onToast }) {
  const [name, setName] = useState(indicator?.name || "");
  const [description, setDescription] = useState(indicator?.description || "");
  const [unit, setUnit] = useState(indicator?.measurement_unit || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!indicator;

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: description || null, measurement_unit: unit || null };
      if (isEdit) await performanceIndicatorService.update(indicator.id, payload);
      else await performanceIndicatorService.create(payload);
      onToast.success(isEdit ? "Indicator updated." : "Indicator created.");
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Failed to save indicator."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit indicator" : "New performance indicator"} onClose={onClose}>
      {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Volume" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Description (optional)</label>
          <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Measurement unit (optional)</label>
          <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. units, %, tickets" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
      </div>
    </Modal>
  );
}

export default AppraisalPage;
