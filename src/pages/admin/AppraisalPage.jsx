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
  appraisalTeamService,
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
  if (s === "completed" || s === "submitted" || s === "locked" || s === "accepted") return "bg-emerald-50 text-emerald-700";
  if (s === "in_progress" || s === "draft" || s === "unlocked" || s === "proposed") return "bg-amber-50 text-amber-700";
  if (s === "rejected") return "bg-red-50 text-red-700";
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
  const { ready } = usePermissions();
  const { user } = useAuth();
  const myEmployeeId = user?.id || null;

  const [context, setContext] = useState(null);
  const [contextError, setContextError] = useState(null);
  const [directory, setDirectory] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootTick, setBootTick] = useState(0);

  useEffect(() => {
    let stale = false;
    setBootLoading(true);
    setContextError(null);
    (async () => {
      try {
        // Access comes from the server (relationships + role permissions), not
        // from what this user happens to be allowed to read. The directory is
        // only used for display names/pickers and is optional.
        const [ctx, cycle, cycleList, dir] = await Promise.all([
          appraisalTeamService.context(),
          appraisalCycleService.current().catch(() => null),
          appraisalCycleService.list().catch(() => []),
          orgService.listDirectory().catch(() => []),
        ]);
        if (stale) return;
        setContext(ctx || null);
        setCurrentCycle(cycle || null);
        setCycles(Array.isArray(cycleList) ? cycleList : []);
        setDirectory(Array.isArray(dir) ? dir : []);
      } catch (err) {
        if (!stale) setContextError(errMsg(err, "Couldn't load your appraisal access."));
      } finally {
        if (!stale) setBootLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, [bootTick]);

  const caps = context?.capabilities || {};
  const isAdmin = !!caps.is_admin;
  const headedDeptIds = useMemo(() => (context?.headed_departments || []).map((d) => d.id), [context]);

  const tabs = useMemo(
    () =>
      [
        { key: "team", label: "My Team", Icon: Users, show: !!context?.can_view_team },
        { key: "reviews", label: "Reviews", Icon: ClipboardCheck, show: !!context?.can_view_team },
        { key: "cycles", label: "Cycles", Icon: Repeat, show: !!context?.can_view_cycles },
        {
          key: "indicators",
          label: "Indicator Library",
          Icon: Gauge,
          show: !!(caps.can_manage_indicator_library || context?.is_department_head),
        },
        { key: "reports", label: "Reports", Icon: BarChart3, show: !!caps.can_view_reports },
      ].filter((t) => t.show),
    [context, caps.can_manage_indicator_library, caps.can_view_reports]
  );

  const [tab, setTab] = useState("team");
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

  if (contextError) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <ErrorState message={contextError} onRetry={() => setBootTick((t) => t + 1)} />
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
              . This page is for line managers, heads of department, reviewers, and anyone given appraisal access in Access
              Management.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const shared = {
    myEmployeeId,
    isAdmin,
    context,
    caps,
    directory,
    cycles,
    headedDeptIds,
    currentCycle,
  };

  return (
    <div className="space-y-6">
      <Header context={context} />
      <CurrentCycleBanner cycle={currentCycle} />
      <TabPills layoutId="appraisal-tab" active={activeTab} onChange={setTab} tabs={tabs} />

      {activeTab === "team" && <MyTeamSection {...shared} />}
      {activeTab === "reviews" && <TeamReviewsSection {...shared} isAdmin={!!caps.can_view_all_reviews || isAdmin} />}
      {activeTab === "cycles" && <CyclesSection {...shared} />}
      {activeTab === "indicators" && <IndicatorsSection {...shared} />}
      {activeTab === "reports" && <ReportsSection {...shared} />}
    </div>
  );
};

const Header = ({ context = null }) => {
  const chips = [];
  if (context?.capabilities?.is_admin) chips.push("Appraisal administrator");
  else if (context?.capabilities?.can_view_all_reviews) chips.push("Review administrator");
  (context?.headed_departments || []).forEach((d) => chips.push(`Head of ${d.name}`));
  if (context?.direct_report_count) {
    chips.push(`Line manager · ${context.direct_report_count} direct report${context.direct_report_count === 1 ? "" : "s"}`);
  }
  if ((context?.designated_reviewer_cycle_ids || []).length) chips.push("Designated reviewer");
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Performance</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Appraisals</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Follow your team's indicators and targets, run reviews, and manage appraisal cycles. Your own appraisal is under{" "}
          <Link to="/app/self-service" className="font-semibold text-brand hover:underline">Self-Service → Appraisals</Link>.
        </p>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-1 text-[11px] font-semibold text-brand">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ===================================================== current cycle banner */

const CYCLE_STEPS = [
  { key: "draft", label: "Draft", hint: "Cycle created; not yet open to staff." },
  { key: "active", label: "Indicators & targets", hint: "Indicators are chosen and staff set their targets." },
  { key: "reviewing", label: "Reviews", hint: "Reviews are called up and scored." },
  { key: "closed", label: "Closed", hint: "Final ratings are computed; no more changes." },
];

function CycleStepper({ status }) {
  const idx = Math.max(0, CYCLE_STEPS.findIndex((s) => s.key === (status === "archived" ? "closed" : status || "draft")));
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {CYCLE_STEPS.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s.key} className="flex items-center gap-1" title={s.hint}>
            <span
              className={`flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ${
                current ? "bg-brand text-white" : done ? "bg-emerald-50 text-emerald-700" : "bg-sunken text-ink-faint"
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {s.label}
            </span>
            {i < CYCLE_STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-ink-ghost" />}
          </li>
        );
      })}
    </ol>
  );
}

function CurrentCycleBanner({ cycle }) {
  if (!cycle) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-card px-5 py-4 text-sm text-ink-muted">
        <Repeat className="h-5 w-5 shrink-0 text-ink-ghost" />
        No appraisal cycle is running for the current administration period.
      </div>
    );
  }
  const step = CYCLE_STEPS.find((s) => s.key === (cycle.status === "archived" ? "closed" : cycle.status)) || CYCLE_STEPS[0];
  return (
    <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-brand/5 to-card px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Current cycle</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="truncate text-base font-bold text-ink">{cycle.name || "Appraisal cycle"}</span>
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {cycle.workflow_type === "bottom_up" ? "Staff propose indicators" : "Department sets indicators"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">{step.hint}</p>
        </div>
        <CycleStepper status={cycle.status} />
      </div>
    </div>
  );
}

/* ================================================================ My Team */

const STAGE_META = {
  no_indicators: { label: "No indicators", cls: "bg-sunken text-ink-muted" },
  awaiting_proposal_review: { label: "Proposals to review", cls: "bg-amber-50 text-amber-700" },
  setting_targets: { label: "Setting targets", cls: "bg-amber-50 text-amber-700" },
  targets_submitted: { label: "Targets submitted", cls: "bg-sky-50 text-sky-700" },
  in_review: { label: "In review", cls: "bg-violet-50 text-violet-700" },
  reviewed: { label: "Reviewed", cls: "bg-emerald-50 text-emerald-700" },
};

const RELATIONSHIP_LABEL = {
  direct_report: "Direct report",
  department: "My department",
  organization: "Organization",
};

const initialsOf = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

function ProgressBar({ value, total }) {
  const p = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sunken">
        <div className={`h-full rounded-full ${p >= 100 ? "bg-emerald-500" : "bg-brand"}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs tabular-nums text-ink-muted">
        {value}/{total}
      </span>
    </div>
  );
}

function MyTeamSection({ context, caps, cycles = [], currentCycle, myEmployeeId, isAdmin }) {
  const toast = useToast();
  const usableCycles = useMemo(() => cycles.filter((c) => c.status !== "archived"), [cycles]);
  const [cycleId, setCycleId] = useState(currentCycle?.id || usableCycles[0]?.id || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [rel, setRel] = useState("all");
  const [stage, setStage] = useState("all");
  const [openEmployeeId, setOpenEmployeeId] = useState(null);
  const [callUpFor, setCallUpFor] = useState(null);
  const [reviewId, setReviewId] = useState(null);

  const load = useCallback(async () => {
    if (!cycleId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await appraisalTeamService.team(cycleId));
    } catch (err) {
      setError(errMsg(err, "Failed to load your team."));
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    load();
  }, [load]);

  const members = useMemo(() => data?.members || [], [data]);
  const cycle = data?.cycle || usableCycles.find((c) => c.id === cycleId) || null;
  const canCallUp = !!cycle && (cycle.status === "active" || cycle.status === "reviewing");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (rel !== "all" && m.relationship !== rel) return false;
      if (stage !== "all" && m.stage !== stage) return false;
      if (!needle) return true;
      return [m.name, m.email, m.department_name, m.job_role_title].some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [members, q, rel, stage]);

  const stats = useMemo(() => {
    const count = (fn) => members.filter(fn).length;
    return {
      total: members.length,
      withIndicators: count((m) => m.indicators.accepted > 0),
      proposals: members.reduce((s, m) => s + m.indicators.pending_proposals, 0),
      submitted: count((m) => ["targets_submitted", "in_review", "reviewed"].includes(m.stage)),
      reviewed: count((m) => m.stage === "reviewed"),
    };
  }, [members]);

  const relationshipOptions = useMemo(() => Array.from(new Set(members.map((m) => m.relationship))), [members]);

  if (usableCycles.length === 0) {
    return (
      <Card>
        <EmptyState Icon={Repeat} title="No appraisal cycles yet" hint="Once an administrator opens a cycle, your team's indicators and targets will appear here." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="People you oversee" value={stats.total} />
        <Metric label="Have indicators" value={`${stats.withIndicators}/${stats.total}`} />
        <Metric label="Proposals to review" value={stats.proposals} />
        <Metric label="Targets submitted" value={`${stats.submitted}/${stats.total}`} />
        <Metric label="Reviewed" value={`${stats.reviewed}/${stats.total}`} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">My Team</h2>
            <p className="text-xs text-ink-muted">
              {isAdmin || caps?.can_view_all_reviews
                ? "Everyone in the organization — open a person to see their indicators, targets and reviews."
                : "Your direct reports and the people in departments you head — open a person to see their indicators, targets and reviews."}
            </p>
          </div>
          <select className={`${inputCls} max-w-xs`} value={cycleId} onChange={(e) => setCycleId(e.target.value)} aria-label="Appraisal cycle">
            {usableCycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || `Cycle ${c.id.slice(0, 8)}`} · {(c.status || "draft").replace(/^\w/, (m) => m.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-5 py-3">
          <input
            className={`${inputCls} max-w-xs`}
            placeholder="Search name, department, role…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search team"
          />
          {relationshipOptions.length > 1 && (
            <select className={`${inputCls} max-w-[11rem]`} value={rel} onChange={(e) => setRel(e.target.value)} aria-label="Relationship">
              <option value="all">Everyone</option>
              {relationshipOptions.map((r) => (
                <option key={r} value={r}>{RELATIONSHIP_LABEL[r]}</option>
              ))}
            </select>
          )}
          <select className={`${inputCls} max-w-[12rem]`} value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Progress">
            <option value="all">Any progress</option>
            {Object.entries(STAGE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-ink-faint">
            {filtered.length} of {members.length}
          </span>
        </div>

        {loading ? (
          <Loading label="Loading your team…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : members.length === 0 ? (
          <EmptyState
            Icon={Users}
            title="Nobody to show for this cycle"
            hint="You'll see people here once someone reports to you as their line manager, you're set as head of a department, or you're given appraisal access in Access Management."
          />
        ) : filtered.length === 0 ? (
          <EmptyState Icon={Users} title="No one matches these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Indicators</th>
                  <th className="px-4 py-3 text-left font-semibold">Targets submitted</th>
                  <th className="px-4 py-3 text-left font-semibold">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold">Review</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const st = STAGE_META[m.stage] || STAGE_META.no_indicators;
                  return (
                    <tr key={m.id} className="cursor-pointer border-t border-line-soft hover:bg-sunken/40" onClick={() => setOpenEmployeeId(m.id)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                            {initialsOf(m.name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink">{m.name}</div>
                            <div className="truncate text-xs text-ink-faint">
                              {[m.job_role_title, m.department_name].filter(Boolean).join(" · ") || m.email}
                            </div>
                          </div>
                          {m.relationship !== "organization" && (
                            <span className="hidden shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-muted sm:inline">
                              {RELATIONSHIP_LABEL[m.relationship]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{m.indicators.accepted}</div>
                        {m.indicators.pending_proposals > 0 && (
                          <div className="text-[11px] font-semibold text-amber-600">+{m.indicators.pending_proposals} proposed</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar value={m.targets.submitted} total={m.indicators.accepted} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {m.review ? (
                          <div>
                            <StatusChip status={m.review.status} />
                            {m.review.overall_rating != null && (
                              <div className="mt-1 text-xs font-semibold text-ink">{pct(m.review.overall_rating)}</div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {m.review ? (
                            <GhostBtn onClick={() => setReviewId(m.review.id)}>Open review</GhostBtn>
                          ) : canCallUp && m.targets.submitted > 0 ? (
                            <GhostBtn onClick={() => setCallUpFor(m)} className="border-brand/30 text-brand hover:bg-brand/5">
                              Call up review
                            </GhostBtn>
                          ) : null}
                          <GhostBtn onClick={() => setOpenEmployeeId(m.id)}>
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </GhostBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openEmployeeId && cycleId && (
        <EmployeeAppraisalDrawer
          cycleId={cycleId}
          employeeId={openEmployeeId}
          onClose={() => setOpenEmployeeId(null)}
          onOpenReview={(id) => setReviewId(id)}
          onCallUp={canCallUp ? (emp) => setCallUpFor(members.find((m) => m.id === emp.id) || { id: emp.id, name: emp.name }) : null}
        />
      )}

      {callUpFor && (
        <CallUpModal
          isAdmin={isAdmin}
          myEmployeeId={myEmployeeId}
          context={context}
          defaultCycle={cycle}
          presetEmployee={callUpFor}
          onClose={() => setCallUpFor(null)}
          onDone={(newId) => {
            setCallUpFor(null);
            load();
            if (newId) setReviewId(newId);
          }}
          onToast={toast}
        />
      )}

      {reviewId && <ReviewDetailModal reviewId={reviewId} editable onClose={() => setReviewId(null)} onChanged={load} />}
    </div>
  );
}

const SCOPE_LABEL = { department: "Department", job_role: "Job role", personal: "Personal" };

function EmployeeAppraisalDrawer({ cycleId, employeeId, onClose, onOpenReview, onCallUp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await appraisalTeamService.employeeOverview(cycleId, employeeId));
    } catch (err) {
      setError(errMsg(err, "Couldn't load this person's appraisal."));
    } finally {
      setLoading(false);
    }
  }, [cycleId, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const indicators = data?.indicators || [];
  const accepted = indicators.filter((i) => i.status !== "proposed" && i.status !== "rejected");
  const totalWeight = accepted.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const submitted = accepted.filter((i) => i.target?.status === "submitted").length;
  const emp = data?.employee;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Employee appraisal"
        className="flex h-full w-full max-w-2xl flex-col bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line-soft px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
              {initialsOf(emp?.name)}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-ink">{emp?.name || "Loading…"}</h3>
              <p className="truncate text-xs text-ink-muted">
                {[emp?.job_role_title, emp?.department_name].filter(Boolean).join(" · ") || emp?.email || ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading ? (
            <Loading label="Loading appraisal…" />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Indicators" value={accepted.length} />
                <Metric label="Targets submitted" value={`${submitted}/${accepted.length}`} />
                <Metric label="Total weight" value={fmtNum(totalWeight)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusChip status={data.locks.indicators_locked ? "locked" : "unlocked"} label={data.locks.indicators_locked ? "Indicators locked" : "Indicators open"} />
                <StatusChip status={data.locks.targets_locked ? "locked" : "unlocked"} label={data.locks.targets_locked ? "Targets locked" : "Targets open"} />
                {emp?.is_direct_report && <StatusChip status="accepted" label="Your direct report" />}
              </div>

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Indicators &amp; targets</h4>
                {indicators.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-muted">
                    No indicators apply to this person in this cycle yet.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {indicators.map((i) => {
                      const t = i.target;
                      return (
                        <li key={i.selection_id} className="rounded-xl border border-line-soft bg-card p-3.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-ink">{i.name}</div>
                              {i.description && <p className="mt-0.5 text-xs text-ink-muted">{i.description}</p>}
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-muted">{SCOPE_LABEL[i.scope]}</span>
                              <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-muted">Weight {fmtNum(i.weight)}</span>
                              {(i.status === "proposed" || i.status === "rejected") && <StatusChip status={i.status} />}
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sunken/50 px-3 py-2">
                            {t ? (
                              <>
                                <div className="text-sm">
                                  <span className="text-ink-muted">Target: </span>
                                  <span className="font-semibold text-ink">
                                    {fmtNum(t.target_value)}
                                    {i.measurement_unit ? ` ${i.measurement_unit}` : ""}
                                  </span>
                                  {t.target_description && <span className="text-ink-muted"> — {t.target_description}</span>}
                                </div>
                                <StatusChip status={t.status} />
                              </>
                            ) : (
                              <span className="text-xs text-ink-faint">
                                {i.status === "proposed" ? "Proposal awaiting a decision from the head of department" : "No target set yet"}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Reviews</h4>
                  {onCallUp && submitted > 0 && (data.reviews || []).length === 0 && (
                    <PrimaryBtn onClick={() => onCallUp(emp)}>
                      <Plus className="h-4 w-4" /> Call up review
                    </PrimaryBtn>
                  )}
                </div>
                {(data.reviews || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line p-5 text-center text-xs text-ink-muted">
                    {submitted > 0 ? "No review yet — call one up when you're ready." : "A review can be called up once targets are submitted."}
                  </div>
                ) : (
                  <ul className="divide-y divide-line-soft rounded-xl border border-line-soft">
                    {data.reviews.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusChip status={r.status} />
                          {r.session_type === "final" && (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">Final</span>
                          )}
                          {r.overall_rating != null && <span className="text-sm font-semibold text-ink">{pct(r.overall_rating)}</span>}
                        </div>
                        <GhostBtn onClick={() => onOpenReview(r.id)}>
                          {r.status === "in_progress" ? "Score" : "Open"} <ChevronRight className="h-3.5 w-3.5" />
                        </GhostBtn>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ============================================================ Team Reviews */

function TeamReviewsSection({ myEmployeeId, isAdmin, context, currentCycle }) {
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
            <h2 className="text-sm font-bold text-ink">Reviews</h2>
            <p className="text-xs text-ink-muted">
              {isAdmin ? "Every review in the organization." : "Reviews where you are the reviewer."} Open one to score each indicator and complete it.
            </p>
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
          <EmptyState Icon={Users} title="No reviews yet" hint="Call up a review from My Team once someone has submitted their targets, or use the button above." />
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
          context={context}
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

function CallUpModal({ isAdmin, myEmployeeId, context, defaultCycle, presetEmployee = null, onClose, onDone, onToast }) {
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState(
    defaultCycle && (defaultCycle.status === "active" || defaultCycle.status === "reviewing") ? defaultCycle.id : ""
  );
  const [employeeId, setEmployeeId] = useState(presetEmployee?.id || "");
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    appraisalCycleService
      .list()
      .catch(() => [])
      .then((cyc) => {
        if (!stale) setCycles(Array.isArray(cyc) ? cyc : []);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, []);

  // The server decides who this user oversees in the chosen cycle (direct
  // reports, their departments, or everyone for admins/designated reviewers).
  useEffect(() => {
    if (!cycleId) {
      setTeam([]);
      return;
    }
    let stale = false;
    setTeamLoading(true);
    appraisalTeamService
      .team(cycleId)
      .then((res) => {
        if (!stale) setTeam(res?.members || []);
      })
      .catch(() => {
        if (!stale) setTeam([]);
      })
      .finally(() => {
        if (!stale) setTeamLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [cycleId]);

  // Only cycles that actually accept call-ups are selectable (backend rejects
  // draft/closed/archived).
  const selectableCycles = useMemo(
    () => cycles.filter((c) => c.status === "active" || c.status === "reviewing"),
    [cycles]
  );
  const selectedCycle = useMemo(() => cycles.find((c) => c.id === cycleId) || null, [cycles, cycleId]);

  // Mirror the backend's assertConfiguredReviewer for the cycle's reviewer
  // assignment, so we never offer a call-up it would reject.
  const employees = useMemo(() => {
    const people = team.filter((p) => p.id !== myEmployeeId);
    if (isAdmin || context?.capabilities?.can_view_all_reviews) return people;
    if (!selectedCycle) return [];
    const type = selectedCycle.reviewer_assignment_type || "relationship";
    const heads = new Set((context?.headed_departments || []).map((d) => d.id));
    if (type === "manager") return people.filter((p) => p.manager_id === myEmployeeId);
    if (type === "department_head") return people.filter((p) => heads.has(p.department_id));
    if (type === "specific_employee" || type === "hr")
      return selectedCycle.reviewer_employee_id === myEmployeeId ? people : [];
    return people; // relationship: anyone you oversee
  }, [team, isAdmin, context, myEmployeeId, selectedCycle]);

  const chosen = employees.find((p) => p.id === employeeId) || null;

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
    <Modal
      title={presetEmployee?.name ? `Call up a review for ${presetEmployee.name}` : "Call up a review"}
      subtitle="Snapshots the employee's submitted targets into a new review you can then score."
      onClose={onClose}
    >
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
                  {c.name || fmtDate(c.created_at)}
                </option>
              ))}
            </select>
            {selectableCycles.length === 0 ? (
              <p className="mt-1 text-[11px] text-amber-600">No active or reviewing cycle is open for call-ups.</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Employee</label>
            <select
              className={inputCls}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={!cycleId || teamLoading}
            >
              <option value="">{!cycleId ? "Select a cycle first…" : teamLoading ? "Loading your team…" : "Select an employee…"}</option>
              {employees.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.department_name ? ` — ${p.department_name}` : ""}
                  {p.targets?.submitted ? "" : " (no submitted targets)"}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ink-faint">
              {cycleId && !teamLoading && employees.length === 0
                ? "You are not the configured reviewer for anyone in this cycle."
                : chosen && !chosen.targets?.submitted
                  ? "This person hasn't submitted any targets yet, so the review can't be called up."
                  : "The employee must have submitted at least one target for the cycle."}
            </p>
          </div>
        </div>
      )}
      <div className="mt-5 flex items-center justify-end gap-2">
        <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
        <PrimaryBtn onClick={submit} disabled={busy || loading || !employeeId || (chosen && !chosen.targets?.submitted)}>
          {busy ? "Calling up…" : "Call up"}
        </PrimaryBtn>
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

function CyclesSection({ directory = [], isAdmin = false, headedDeptIds = [], context = null, caps = {} }) {
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
    return <CycleDetail cycleId={detailId} directory={directory} isAdmin={isAdmin} headedDeptIds={headedDeptIds} context={context} caps={caps} onBack={() => { setDetailId(null); load(); }} />;
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
          {/* Opening a cycle needs Appraisal Cycle -> Create; a department head only manages its indicator selection. */}
          {(isAdmin || caps.can_open_cycle) && (
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

function CycleDetail({ cycleId, directory = [], isAdmin = false, headedDeptIds = [], context = null, caps = {}, onBack }) {
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
  const [indicatorLocks, setIndicatorLocks] = useState([]);
  const [indicatorLockBusy, setIndicatorLockBusy] = useState(false);
  const [reviewingId, setReviewingId] = useState(null); // selection id whose inline edit form is open
  const [reviewBusyId, setReviewBusyId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editWeight, setEditWeight] = useState("");

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
      // Users without Department / Job Role read access (e.g. a head of
      // department on a basic role) still get the ones they may manage.
      setDepartments(Array.isArray(depts) && depts.length ? depts : context?.manageable_departments || []);
      setJobRoles(Array.isArray(roles) && roles.length ? roles : context?.job_roles || []);
      setCatalog(Array.isArray(cat) ? cat : []);
      setSessions(Array.isArray(sess) ? sess : []);
    } catch (err) {
      setError(errMsg(err, "Failed to load cycle."));
    } finally {
      setLoading(false);
    }
  }, [cycleId, context]);

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
  // Admins and roles granted Department Performance Indicator access act on
  // every department; a head of department only on the ones they head.
  const canManageAllDepts = isAdmin || !!caps.can_manage_all_department_indicators;
  const canSeeProgress = canManageAllDepts || headedDeptIds.includes(deptId);
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
  const isBottomUp = cycle?.workflow_type === "bottom_up";
  const deptIndicatorLock = indicatorLocks.find((l) => l.department_id === deptId) || null;

  const loadIndicatorLocks = useCallback(async () => {
    if (!isBottomUp) {
      setIndicatorLocks([]);
      return;
    }
    try {
      const rows = await appraisalCycleService.listIndicatorLocks(cycleId);
      setIndicatorLocks(Array.isArray(rows) ? rows : []);
    } catch {
      setIndicatorLocks([]);
    }
  }, [cycleId, isBottomUp]);

  useEffect(() => {
    loadIndicatorLocks();
  }, [loadIndicatorLocks]);

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

  // ── Bottom-up: reviewing personal indicator proposals ───────────────────

  const startEditProposal = (sel) => {
    setReviewingId(sel.id);
    setEditName(sel.performance_indicator_name || "");
    setEditWeight(String(sel.weight ?? ""));
  };

  const reviewProposal = async (sel, action) => {
    setReviewBusyId(sel.id);
    try {
      const payload = { action };
      if (action === "edit") {
        payload.name = editName.trim();
        payload.weight = Number(editWeight);
        if (!payload.name) {
          toast.error("Name is required.");
          setReviewBusyId(null);
          return;
        }
        if (!Number.isFinite(payload.weight) || payload.weight < 0) {
          toast.error("Enter a weight of 0 or more.");
          setReviewBusyId(null);
          return;
        }
      }
      await appraisalCycleService.reviewIndicatorProposal(cycleId, deptId, sel.id, payload);
      toast.success(action === "reject" ? "Proposal rejected." : "Proposal accepted.");
      setReviewingId(null);
      await loadSelections();
    } catch (err) {
      toast.error(errMsg(err, "Failed to review the proposal."));
    } finally {
      setReviewBusyId(null);
    }
  };

  const lockDeptIndicators = async () => {
    const undecided = selections.filter((s) => s.employee_id && s.status === "proposed").length;
    const ok = await confirm({
      title: "Lock in department indicators?",
      message:
        undecided > 0
          ? `${undecided} proposal${undecided === 1 ? "" : "s"} still need${undecided === 1 ? "s" : ""} a decision — accept or reject them first.`
          : "Once locked, no new proposals can be submitted and employees can begin setting targets against the accepted indicators.",
      confirmLabel: "Lock indicators",
      danger: true,
    });
    if (!ok) return;
    setIndicatorLockBusy(true);
    try {
      await appraisalCycleService.lockDepartmentIndicators(cycleId, deptId);
      toast.success("Department indicators locked in.");
      await loadIndicatorLocks();
    } catch (err) {
      toast.error(errMsg(err, "Failed to lock department indicators."));
    } finally {
      setIndicatorLockBusy(false);
    }
  };

  const unlockDeptIndicators = async () => {
    const ok = await confirm({
      title: "Unlock department indicators?",
      message: "Department heads will be able to review new proposals again. Not possible once targets are locked.",
      confirmLabel: "Unlock",
      danger: true,
    });
    if (!ok) return;
    setIndicatorLockBusy(true);
    try {
      await appraisalCycleService.unlockDepartmentIndicators(cycleId, deptId);
      toast.success("Department indicators unlocked.");
      await loadIndicatorLocks();
    } catch (err) {
      toast.error(errMsg(err, "Failed to unlock department indicators."));
    } finally {
      setIndicatorLockBusy(false);
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
  const visibleDepartments = canManageAllDepts ? departments : departments.filter((d) => headedDeptIds.includes(d.id));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs font-semibold text-brand hover:underline">← Back to cycles</button>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">{cycle.name || `Cycle ${cycle.id.slice(0, 8)}`}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusChip status={cycle.status || "draft"} label={`Lifecycle: ${(cycle.status || "draft").replace(/^\w/, (m) => m.toUpperCase())}`} />
              <StatusChip status={isBottomUp ? "bottom_up" : "top_down"} label={isBottomUp ? "Bottom to top" : "Top to bottom"} />
              {!isBottomUp && (
                <StatusChip status={locked ? "locked" : "unlocked"} label={locked ? "Indicators locked" : "Open for selection"} />
              )}
              {cycle.locked_at && !isBottomUp ? <span className="text-[11px] text-ink-faint">Locked {fmtDate(cycle.locked_at)}</span> : null}
              {cycle.closed_at ? <span className="text-[11px] text-ink-faint">Closed {fmtDate(cycle.closed_at)}</span> : null}
            </div>
          </div>
          {/* Lock + lifecycle transitions follow the Appraisal Cycle permissions (lock / update). */}
          {(isAdmin || caps.can_lock || caps.can_change_cycle_status) && (
            <div className="flex flex-wrap items-center gap-2">
              {(isAdmin || caps.can_lock) && !locked && !isBottomUp ? (
                <PrimaryBtn onClick={lock} disabled={locking}>
                  <Lock className="h-4 w-4" /> {locking ? "Locking…" : "Lock indicators"}
                </PrimaryBtn>
              ) : null}
              {(isAdmin || caps.can_change_cycle_status ? NEXT_STATUS[cycle.status || "draft"] || [] : []).map((s) => (
                <GhostBtn key={s} onClick={() => transition(s)}>
                  {s === "reviewing" ? "Start reviewing" : s === "closed" ? "Close cycle" : s === "archived" ? "Archive" : s === "active" ? "Reopen to active" : s}
                </GhostBtn>
              ))}
            </div>
          )}
        </div>

        {(isAdmin || caps.can_assign_reviewer) && cycle.status !== "closed" && cycle.status !== "archived" && (
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
            {!isBottomUp && deptId && !locked && !progress?.locked ? (
              <PrimaryBtn onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add indicator
              </PrimaryBtn>
            ) : null}
            {isBottomUp && deptId && canSeeProgress && !deptIndicatorLock ? (
              <PrimaryBtn onClick={lockDeptIndicators} disabled={indicatorLockBusy}>
                <Lock className="h-4 w-4" /> {indicatorLockBusy ? "Locking…" : "Lock indicators"}
              </PrimaryBtn>
            ) : null}
          </div>

          {isBottomUp && deptId && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusChip status={deptIndicatorLock ? "locked" : "unlocked"} label={deptIndicatorLock ? `Indicators locked ${deptIndicatorLock.locked_at ? fmtDate(deptIndicatorLock.locked_at) : ""}` : "Under review"} />
              {deptIndicatorLock && (isAdmin || caps.can_unlock) && (
                <GhostBtn onClick={unlockDeptIndicators} disabled={indicatorLockBusy} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  {indicatorLockBusy ? "Unlocking…" : "Unlock"}
                </GhostBtn>
              )}
            </div>
          )}

          <div className="mt-4">
            {!deptId ? (
              <p className="py-8 text-center text-xs text-ink-muted">
                {isBottomUp ? "Select a department to review employees' proposed indicators." : "Select a department to view and manage its performance indicators."}
              </p>
            ) : selLoading ? (
              <Loading label="Loading indicators…" />
            ) : selections.length === 0 ? (
              <EmptyState
                Icon={Gauge}
                title={isBottomUp ? "No indicators proposed yet" : "No indicators selected"}
                hint={
                  isBottomUp
                    ? "Employees in this department haven't proposed any performance indicators yet."
                    : locked
                      ? "This department has no indicators and the cycle is locked."
                      : "Add performance indicators for this department."
                }
              />
            ) : isBottomUp ? (
              <div className="overflow-x-auto rounded-xl border border-line-soft">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Indicator</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Proposed by</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Weight</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                      {!deptIndicatorLock ? <th className="px-3 py-2.5" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {selections.map((s) => {
                      const proposer = directory.find((p) => p.id === s.employee_id);
                      const editing = reviewingId === s.id;
                      const decidable = !deptIndicatorLock && s.status !== "rejected";
                      return (
                        <tr key={s.id} className="border-t border-line-soft align-top">
                          <td className="px-4 py-3">
                            {editing ? (
                              <input className={`${inputCls} h-9`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                            ) : (
                              <>
                                <div className="font-semibold text-ink">{s.performance_indicator_name || "Indicator"}</div>
                                {s.measurement_unit ? <div className="text-[11px] text-ink-faint">Unit: {s.measurement_unit}</div> : null}
                                {s.performance_indicator_description ? <div className="text-[11px] text-ink-faint">{s.performance_indicator_description}</div> : null}
                              </>
                            )}
                          </td>
                          <td className="px-3 py-3 text-ink-muted">{proposer ? getEmployeeName(proposer, proposer.email) : "—"}</td>
                          <td className="px-3 py-3 text-ink-muted">
                            {editing ? (
                              <input type="number" min="0" step="0.1" className={`${inputCls} h-9 w-24`} value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
                            ) : (
                              fmtNum(s.weight)
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <StatusChip status={s.status} label={(s.status || "proposed").replace(/^\w/, (m) => m.toUpperCase())} />
                          </td>
                          {!deptIndicatorLock ? (
                            <td className="px-3 py-3 text-right">
                              {editing ? (
                                <div className="flex justify-end gap-1.5">
                                  <GhostBtn onClick={() => setReviewingId(null)} disabled={reviewBusyId === s.id}>Cancel</GhostBtn>
                                  <PrimaryBtn onClick={() => reviewProposal(s, "edit")} disabled={reviewBusyId === s.id}>
                                    {reviewBusyId === s.id ? "Saving…" : "Save"}
                                  </PrimaryBtn>
                                </div>
                              ) : decidable ? (
                                <div className="flex justify-end gap-1.5">
                                  {s.status !== "accepted" && (
                                    <GhostBtn onClick={() => reviewProposal(s, "accept")} disabled={reviewBusyId === s.id} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                                      <Check className="h-3.5 w-3.5" /> Accept
                                    </GhostBtn>
                                  )}
                                  <GhostBtn onClick={() => startEditProposal(s)} disabled={reviewBusyId === s.id}>
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                  </GhostBtn>
                                  <GhostBtn onClick={() => reviewProposal(s, "reject")} disabled={reviewBusyId === s.id} className="border-red-200 text-red-600 hover:bg-red-50">
                                    <X className="h-3.5 w-3.5" /> Reject
                                  </GhostBtn>
                                </div>
                              ) : null}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                      {(isAdmin || caps.can_unlock) && (
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
              {isAdmin || caps.can_manage_sessions
                ? "Call up a review at any time during the period; the final review ends the appraisal and computes the main ratings."
                : "Reviews the administrator has called up for this cycle."}
            </p>
          </div>
          {(isAdmin || caps.can_manage_sessions) && !openSession && cycle.status !== "closed" && cycle.status !== "archived" && (
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
                      {(isAdmin || caps.can_manage_sessions) && s.status === "open" ? (
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
