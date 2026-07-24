import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Target,
  Users,
  Repeat,
  Gauge,
  BarChart3,
  Plus,
  Check,
  X,
  Lock,
  Send,
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
  appraisalTargetService,
  appraisalReviewService,
} from "../../services/appraisalService";
import { administrationPeriodService } from "../../services/administrationPeriodService";
import { setupService } from "../../services/setupService";
import { orgService } from "../../services/orgService";

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
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const [depts, dir, cycle, period, cycleList] = await Promise.all([
          setupService.getDepartments().then((r) => (Array.isArray(r) ? r : r?.departments || [])).catch(() => []),
          orgService.listDirectory().catch(() => []),
          appraisalCycleService.current().catch(() => null),
          administrationPeriodService.current().catch(() => null),
          appraisalCycleService.list().catch(() => []),
        ]);
        if (stale) return;
        setDepartments(Array.isArray(depts) ? depts : []);
        setDirectory(Array.isArray(dir) ? dir : []);
        setCurrentCycle(cycle || null);
        setCurrentPeriod(period || null);
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
  const canManageCycles = isAdmin; // open/lock/transition/reviewer-assignment are admin-only
  // Department heads reach the Cycles tab too, but only to manage their own
  // department's per-cycle indicator selection (backend allows head or admin).
  const canViewCycles = isAdmin || isDeptHead;
  const canManageIndicators = isAdmin || isDeptHead;
  const canReviewTeam = isAdmin || isDeptHead || isManager || isDesignatedReviewer;

  const tabs = useMemo(
    () =>
      [
        { key: "my-targets", label: "My Targets", Icon: Target, show: true },
        { key: "my-reviews", label: "My Reviews", Icon: ClipboardCheck, show: true },
        { key: "team-reviews", label: "Team Reviews", Icon: Users, show: canReviewTeam },
        { key: "cycles", label: "Cycles", Icon: Repeat, show: canViewCycles },
        { key: "indicators", label: "Indicators", Icon: Gauge, show: canManageIndicators },
        { key: "reports", label: "Reports", Icon: BarChart3, show: isAdmin },
      ].filter((t) => t.show),
    [canReviewTeam, canViewCycles, canManageIndicators, isAdmin]
  );

  const [tab, setTab] = useState("my-targets");
  // Derive the effective tab so capability changes can't strand us on a hidden
  // tab, without a setState-in-effect round-trip.
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key || "my-targets";

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

  const shared = {
    myEmployeeId,
    myDeptId: user?.department_id || null,
    myJobRoleId: user?.job_role_id || null,
    isAdmin,
    departments,
    directory,
    headedDeptIds,
    managedEmployeeIds,
    currentCycle,
    currentPeriod,
  };

  return (
    <div className="space-y-6">
      <Header />
      <TabPills layoutId="appraisal-tab" active={activeTab} onChange={setTab} tabs={tabs} />

      {activeTab === "my-targets" && <MyTargetsSection {...shared} />}
      {activeTab === "my-reviews" && <MyReviewsSection {...shared} />}
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
      Set performance targets, run appraisal cycles, and complete reviews. Your available tabs depend on your role.
    </p>
  </div>
);

/* ============================================================ My Targets */

function MyTargetsSection({ myDeptId, myJobRoleId, currentCycle, currentPeriod }) {
  const toast = useToast();
  const [indicators, setIndicators] = useState([]); // department indicator selections applicable to me
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { selection, target|null }
  const cycleId = currentCycle?.id || null;

  const load = useCallback(async () => {
    if (!cycleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const mine = await appraisalTargetService.listMine(cycleId);
      setTargets(Array.isArray(mine) ? mine : []);
      // Department indicator selections that apply to me — the ones I can set
      // targets against. department_id/job_role_id come from the auth profile.
      if (myDeptId) {
        try {
          const sel = await appraisalCycleService.listDepartmentIndicators(cycleId, myDeptId, myJobRoleId);
          setIndicators(Array.isArray(sel) ? sel : []);
        } catch {
          setIndicators([]);
        }
      } else {
        setIndicators([]);
      }
    } catch (err) {
      setError(errMsg(err, "Failed to load your targets."));
    } finally {
      setLoading(false);
    }
  }, [cycleId, myDeptId, myJobRoleId]);

  useEffect(() => {
    load();
  }, [load]);

  const targetBySelection = useMemo(() => {
    const m = {};
    for (const t of targets) m[t.department_performance_indicator_id] = t;
    return m;
  }, [targets]);

  const locked = !!currentCycle?.indicators_locked;
  const periodActive = String(currentPeriod?.status || "").toLowerCase() === "active";
  // The backend only accepts target create/edit/submit while the cycle is
  // 'active'; once it advances to reviewing/closed/archived the target window
  // is over even though indicators stay locked and the period may stay open.
  const cycleActive = currentCycle?.status ? currentCycle.status === "active" : true;
  const canSetTargets = locked && periodActive && cycleActive;

  if (!currentCycle?.id) {
    return (
      <Card>
        <EmptyState Icon={Target} title="No active appraisal cycle" hint="Once an administrator opens and locks an appraisal cycle for the current period, your performance indicators will appear here." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!canSetTargets && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {!locked
              ? "Performance indicators for this cycle are not locked yet. Targets open once an administrator locks the indicators."
              : !cycleActive
                ? `The target window is closed — this appraisal cycle is now ${currentCycle.status}.`
                : "Targets can only be set while the appraisal period is active."}
          </span>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">My Performance Targets</h2>
            <p className="text-xs text-ink-muted">Cycle: {currentCycle.name || fmtDate(currentCycle.created_at)}</p>
          </div>
        </div>

        {loading ? (
          <Loading label="Loading your targets…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : indicators.length === 0 && targets.length === 0 ? (
          <EmptyState Icon={Target} title="No indicators assigned to you yet" hint="Your department head or an administrator selects the performance indicators that apply to your department and job role." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Indicator</th>
                  <th className="px-4 py-3 text-left font-semibold">Weight</th>
                  <th className="px-4 py-3 text-left font-semibold">My Target</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {indicators.map((sel) => {
                  const t = targetBySelection[sel.id];
                  return (
                    <tr key={sel.id} className="border-t border-line-soft">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-ink">{sel.performance_indicator_name || "Indicator"}</div>
                        {sel.performance_indicator_description ? (
                          <div className="text-xs text-ink-muted">{sel.performance_indicator_description}</div>
                        ) : null}
                        {sel.measurement_unit ? <div className="text-[11px] text-ink-faint">Unit: {sel.measurement_unit}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{fmtNum(sel.weight)}</td>
                      <td className="px-4 py-3">
                        {t ? (
                          <div>
                            <div className="font-semibold text-ink">{fmtNum(t.target_value)}</div>
                            {t.target_description ? <div className="text-xs text-ink-muted">{t.target_description}</div> : null}
                          </div>
                        ) : (
                          <span className="text-ink-faint">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{t ? <StatusChip status={t.status} /> : <span className="text-ink-faint">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        {t?.status === "submitted" ? (
                          <span className="text-[11px] font-semibold text-emerald-600">Submitted</span>
                        ) : canSetTargets ? (
                          <GhostBtn onClick={() => setEditing({ selection: sel, target: t || null })}>
                            {t ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {t ? "Edit" : "Set target"}
                          </GhostBtn>
                        ) : (
                          <span className="text-[11px] text-ink-faint">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Targets whose selection is no longer returned (e.g. role filter) still surface */}
                {targets
                  .filter((t) => !indicators.some((s) => s.id === t.department_performance_indicator_id))
                  .map((t) => (
                    <tr key={t.id} className="border-t border-line-soft">
                      <td className="px-5 py-3 font-semibold text-ink">Indicator</td>
                      <td className="px-4 py-3 text-ink-muted">—</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{fmtNum(t.target_value)}</div>
                        {t.target_description ? <div className="text-xs text-ink-muted">{t.target_description}</div> : null}
                      </td>
                      <td className="px-4 py-3"><StatusChip status={t.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {t.status === "draft" && canSetTargets ? (
                          <GhostBtn onClick={() => setEditing({ selection: null, target: t })}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </GhostBtn>
                        ) : (
                          <StatusChip status={t.status} />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <TargetModal
          cycleId={currentCycle.id}
          selection={editing.selection}
          target={editing.target}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onToast={toast}
        />
      )}
    </div>
  );
}

function TargetModal({ cycleId, selection, target, onClose, onSaved, onToast }) {
  const confirm = useConfirm();
  const [value, setValue] = useState(target ? String(target.target_value) : "");
  const [desc, setDesc] = useState(target?.target_description || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!target;

  const save = async () => {
    setError(null);
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      setError("Target value must be a non-negative number.");
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await appraisalTargetService.update(target.id, { target_value: num, target_description: desc || null });
      } else {
        await appraisalTargetService.create({
          appraisal_cycle_id: cycleId,
          department_performance_indicator_id: selection.id,
          target_value: num,
          target_description: desc || null,
        });
      }
      onToast.success("Target saved.");
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Failed to save target."));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!isEdit) return;
    const ok = await confirm({
      title: "Submit target?",
      message: "Once submitted, this target is locked and can no longer be edited. It becomes available for your performance review.",
      confirmLabel: "Submit",
      danger: false,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await appraisalTargetService.submit(target.id);
      onToast.success("Target submitted.");
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Failed to submit target."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit target" : "Set target"}
      subtitle={selection?.performance_indicator_name || (isEdit ? "Update your draft target" : undefined)}
      onClose={onClose}
    >
      {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">
            Target value{selection?.measurement_unit ? ` (${selection.measurement_unit})` : ""}
          </label>
          <input className={inputCls} type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Description (optional)</label>
          <textarea className={inputCls} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="How will this target be measured?" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        <div>
          {isEdit && target.status === "draft" ? (
            <GhostBtn onClick={submit} disabled={busy} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Send className="h-3.5 w-3.5" /> Submit target
            </GhostBtn>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
          <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================ My Reviews */

function MyReviewsSection({ myEmployeeId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await appraisalReviewService.list();
      // Reviews where I am the reviewed employee (not the reviewer).
      const mine = (Array.isArray(rows) ? rows : []).filter((r) => r.employee_id === myEmployeeId);
      setReviews(mine);
    } catch (err) {
      setError(errMsg(err, "Failed to load your reviews."));
    } finally {
      setLoading(false);
    }
  }, [myEmployeeId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <div className="border-b border-line-soft px-5 py-4">
        <h2 className="text-sm font-bold text-ink">My Performance Reviews</h2>
        <p className="text-xs text-ink-muted">Reviews carried out on your submitted targets.</p>
      </div>
      {loading ? (
        <Loading label="Loading your reviews…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : reviews.length === 0 ? (
        <EmptyState Icon={ClipboardCheck} title="No reviews yet" hint="When your manager or department head calls up a review of your submitted targets, it appears here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Review</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Overall rating</th>
                <th className="px-4 py-3 text-left font-semibold">Reviewed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-t border-line-soft">
                  <td className="px-5 py-3 text-ink">
                    <div className="font-medium">{r.cycle_name || "Appraisal review"}</div>
                    {r.reviewer_name && <div className="text-xs text-ink-faint">Reviewer: {r.reviewer_name}</div>}
                  </td>
                  <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                  <td className="px-4 py-3 font-semibold text-ink">{r.overall_rating != null ? pct(r.overall_rating) : "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{fmtDate(r.reviewed_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <GhostBtn onClick={() => setOpenId(r.id)}>
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </GhostBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && <ReviewDetailModal reviewId={openId} editable={false} asEmployee onClose={() => setOpenId(null)} onChanged={load} />}
    </Card>
  );
}

/* ============================================================ Team Reviews */

function TeamReviewsSection({ myEmployeeId, isAdmin, headedDeptIds, managedEmployeeIds = [], directory = [], currentCycle }) {
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
                      <div className="font-medium">{r.employee_name || r.employee_id.slice(0, 8)}</div>
                      {r.cycle_name && <div className="text-xs text-ink-faint">{r.cycle_name}</div>}
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

/* -------------------------------------------------- Review detail (shared) */

function ReviewDetailModal({ reviewId, editable, asEmployee = false, onClose, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingItem, setSavingItem] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appeals, setAppeals] = useState([]);
  const [reviewerComments, setReviewerComments] = useState("");
  const [drafts, setDrafts] = useState({}); // itemId -> { achieved_value, comments }

  const loadAppeals = useCallback(async () => {
    try {
      const rows = await appraisalReviewService.listAppeals(reviewId);
      setAppeals(Array.isArray(rows) ? rows : []);
    } catch {
      setAppeals([]);
    }
  }, [reviewId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await appraisalReviewService.get(reviewId);
      setReview(r);
      setReviewerComments(r?.reviewer_comments || "");
      const d = {};
      (r?.items || []).forEach((it) => {
        d[it.id] = {
          achieved_value: it.achieved_value != null ? String(it.achieved_value) : "",
          comments: it.comments || "",
        };
      });
      setDrafts(d);
      await loadAppeals();
    } catch (err) {
      setError(errMsg(err, "Failed to load review."));
    } finally {
      setLoading(false);
    }
  }, [reviewId, loadAppeals]);

  useEffect(() => {
    load();
  }, [load]);

  const isInProgress = review?.status === "in_progress";
  const canEdit = editable && isInProgress;

  const saveItem = async (item) => {
    const draft = drafts[item.id] || {};
    const num = Number(draft.achieved_value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Achieved value must be a non-negative number.");
      return;
    }
    setSavingItem(item.id);
    try {
      const updated = await appraisalReviewService.submitItem(reviewId, item.id, {
        achieved_value: num,
        comments: draft.comments || null,
      });
      setReview(updated);
      toast.success("Result saved.");
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err, "Failed to save result."));
    } finally {
      setSavingItem(null);
    }
  };

  const complete = async () => {
    const missing = (review?.items || []).some((it) => it.achieved_value == null);
    if (missing) {
      toast.error("Every indicator needs an achieved value before completing.");
      return;
    }
    const ok = await confirm({
      title: "Complete review?",
      message: "This finalizes the review and computes the overall weighted rating. It cannot be reopened.",
      confirmLabel: "Complete review",
      danger: false,
    });
    if (!ok) return;
    setCompleting(true);
    try {
      const updated = await appraisalReviewService.complete(reviewId, reviewerComments);
      setReview(updated);
      toast.success("Review completed.");
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err, "Failed to complete review."));
    } finally {
      setCompleting(false);
    }
  };

  const runAction = async (fn, successMsg, failMsg) => {
    setBusyAction(true);
    try {
      const updated = await fn();
      // Only a review-with-items payload may replace review state. publish/
      // acknowledge return that shape; requestAppeal returns an APPEAL row
      // (status:'open', no items) — feeding it to setReview would blank the
      // review view, so fall through to a full reload for anything else.
      if (updated && updated.status && Array.isArray(updated.items)) setReview(updated);
      else await load();
      toast.success(successMsg);
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err, failMsg));
    } finally {
      setBusyAction(false);
    }
  };

  const publish = () =>
    runAction(() => appraisalReviewService.publish(reviewId), "Review published to the employee.", "Failed to publish review.");
  const acknowledge = () =>
    runAction(() => appraisalReviewService.acknowledge(reviewId), "Appraisal acknowledged.", "Failed to acknowledge.");
  const submitAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error("Please enter a reason for the appeal.");
      return;
    }
    await runAction(
      () => appraisalReviewService.requestAppeal(reviewId, appealReason.trim()),
      "Appeal submitted.",
      "Failed to submit appeal.",
    );
    setAppealOpen(false);
    setAppealReason("");
    await loadAppeals();
  };
  const resolveAppeal = async (appealId) => {
    const resolution = window.prompt("Resolution note for this appeal:");
    if (resolution == null || !resolution.trim()) return;
    try {
      await appraisalReviewService.resolveAppeal(appealId, resolution.trim());
      toast.success("Appeal resolved.");
      await loadAppeals();
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err, "Failed to resolve appeal."));
    }
  };

  const status = review?.status;
  const hasOpenAppeal = appeals.some((a) => a.status === "open");
  const canPublish = editable && status === "completed";
  const canAcknowledge = asEmployee && status === "published";
  // Backend allows at most one open appeal per review, so hide the affordance
  // once one is pending (it's already visible in the appeals list below).
  const canAppeal = asEmployee && (status === "published" || status === "acknowledged") && !hasOpenAppeal;
  const canResolveAppeals = editable; // reviewer/admin context (backend enforces the real check)

  return (
    <Modal
      title="Performance review"
      subtitle={review ? (review.employee_name ? `${review.employee_name}${review.cycle_name ? ` · ${review.cycle_name}` : ""}` : `Status: ${String(review.status).replace(/_/g, " ")}`) : undefined}
      onClose={onClose}
      maxW="max-w-3xl"
    >
      {loading ? (
        <Loading label="Loading review…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : review ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-sunken/50 px-4 py-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Employee</div>
              <div className="font-semibold text-ink">{review.employee_name || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Reviewer</div>
              <div className="text-ink-muted">{review.reviewer_name || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Status</div>
              <StatusChip status={review.status} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Overall rating</div>
              <div className="font-bold text-ink">{review.overall_rating != null ? pct(review.overall_rating) : "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Department</div>
              <div className="text-ink-muted">{review.department_name || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Job role</div>
              <div className="text-ink-muted">{review.job_role_name || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Reviewed</div>
              <div className="text-ink-muted">{fmtDate(review.reviewed_at)}</div>
            </div>
            {review.published_at && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-faint">Published</div>
                <div className="text-ink-muted">{fmtDate(review.published_at)}</div>
              </div>
            )}
            {review.acknowledged_at && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-faint">Acknowledged</div>
                <div className="text-emerald-600">{fmtDate(review.acknowledged_at)}</div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-line-soft">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Indicator</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Weight</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Target</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Achieved</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Rating</th>
                  {canEdit ? <th className="px-3 py-2.5" /> : null}
                </tr>
              </thead>
              <tbody>
                {(review.items || []).map((it) => {
                  const draft = drafts[it.id] || {};
                  return (
                    <tr key={it.id} className="border-t border-line-soft align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{it.indicator_name}</div>
                        {!canEdit && it.comments ? <div className="mt-0.5 text-xs text-ink-muted">{it.comments}</div> : null}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{fmtNum(it.weight)}</td>
                      <td className="px-3 py-3 text-ink-muted">{fmtNum(it.target_value)}</td>
                      <td className="px-3 py-3">
                        {canEdit ? (
                          <input
                            className={`${inputCls} w-24`}
                            type="number"
                            min="0"
                            step="any"
                            value={draft.achieved_value}
                            onChange={(e) => setDrafts((p) => ({ ...p, [it.id]: { ...p[it.id], achieved_value: e.target.value } }))}
                          />
                        ) : (
                          <span className="font-semibold text-ink">{it.achieved_value != null ? fmtNum(it.achieved_value) : "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink">{it.rating_percentage != null ? pct(it.rating_percentage) : "—"}</td>
                      {canEdit ? (
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1.5">
                            <input
                              className={`${inputCls} min-w-[160px]`}
                              placeholder="Comment (optional)"
                              value={draft.comments}
                              onChange={(e) => setDrafts((p) => ({ ...p, [it.id]: { ...p[it.id], comments: e.target.value } }))}
                            />
                            <GhostBtn onClick={() => saveItem(it)} disabled={savingItem === it.id}>
                              <Check className="h-3.5 w-3.5" /> {savingItem === it.id ? "Saving…" : "Save"}
                            </GhostBtn>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
                {(review.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-xs text-ink-muted">
                      This review has no indicators.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {review.reviewer_comments && !canEdit ? (
            <div className="rounded-xl border border-line-soft bg-sunken/40 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Reviewer comments</div>
              <div className="mt-1 text-sm text-ink">{review.reviewer_comments}</div>
            </div>
          ) : null}

          {canEdit ? (
            <div className="space-y-2 rounded-xl border border-line-soft px-4 py-3">
              <label className="block text-xs font-semibold text-ink-muted">Reviewer comments (optional)</label>
              <textarea className={inputCls} rows={2} value={reviewerComments} onChange={(e) => setReviewerComments(e.target.value)} placeholder="Overall feedback for this review" />
              <div className="flex justify-end">
                <PrimaryBtn onClick={complete} disabled={completing}>
                  <Check className="h-4 w-4" /> {completing ? "Completing…" : "Complete review"}
                </PrimaryBtn>
              </div>
            </div>
          ) : null}

          {appeals.length > 0 && (
            <div className="rounded-xl border border-line-soft px-4 py-3">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-faint">Appeals</div>
              <div className="space-y-2">
                {appeals.map((a) => (
                  <div key={a.id} className="rounded-lg bg-sunken/40 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <StatusChip status={a.status} label={a.status === "open" ? "Open" : "Resolved"} />
                      <span className="text-[11px] text-ink-faint">{fmtDate(a.created_at)}</span>
                    </div>
                    <div className="mt-1 text-ink">{a.reason}</div>
                    {a.resolution && (
                      <div className="mt-1 text-xs text-ink-muted">
                        Resolution: {a.resolution}{a.resolved_at ? ` · ${fmtDate(a.resolved_at)}` : ""}
                      </div>
                    )}
                    {a.status === "open" && canResolveAppeals && (
                      <div className="mt-2 flex justify-end">
                        <GhostBtn onClick={() => resolveAppeal(a.id)}>Resolve appeal</GhostBtn>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(canPublish || canAcknowledge || canAppeal) && (
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-line-soft px-4 py-3">
              {status === "acknowledged" && (
                <span className="mr-auto text-xs text-emerald-600">
                  Acknowledged{review.acknowledged_at ? ` on ${fmtDate(review.acknowledged_at)}` : ""}
                </span>
              )}
              {canPublish && (
                <PrimaryBtn onClick={publish} disabled={busyAction}>
                  {busyAction ? "Publishing…" : "Publish to employee"}
                </PrimaryBtn>
              )}
              {canAcknowledge && (
                <PrimaryBtn onClick={acknowledge} disabled={busyAction}>
                  {busyAction ? "…" : "Acknowledge"}
                </PrimaryBtn>
              )}
              {canAppeal && !appealOpen && (
                <GhostBtn onClick={() => setAppealOpen(true)} disabled={busyAction}>
                  Appeal
                </GhostBtn>
              )}
            </div>
          )}

          {canAppeal && appealOpen && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
              <label className="block text-xs font-semibold text-ink-muted">Reason for appeal</label>
              <textarea className={inputCls} rows={3} value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Explain why you're appealing this appraisal…" />
              <div className="flex justify-end gap-2">
                <GhostBtn onClick={() => { setAppealOpen(false); setAppealReason(""); }}>Cancel</GhostBtn>
                <PrimaryBtn onClick={submitAppeal} disabled={busyAction || !appealReason.trim()}>
                  {busyAction ? "Submitting…" : "Submit appeal"}
                </PrimaryBtn>
              </div>
            </div>
          )}
        </div>
      ) : null}
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

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await appraisalReviewService.report(cycleId || undefined);
      setReport(res?.data || res);
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
                ? "Open a cycle per administration period, select indicators, then lock."
                : "Select and manage the performance indicators for your department in each cycle."}
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

  const loadCycle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, depts, roles, cat] = await Promise.all([
        appraisalCycleService.get(cycleId),
        setupService.getDepartments().then((r) => (Array.isArray(r) ? r : r?.departments || [])).catch(() => []),
        setupService.getJobRoles().then((r) => (Array.isArray(r) ? r : r?.jobRoles || r?.job_roles || [])).catch(() => []),
        performanceIndicatorService.list().catch(() => []),
      ]);
      setCycle(c);
      setDepartments(Array.isArray(depts) ? depts : []);
      setJobRoles(Array.isArray(roles) ? roles : []);
      setCatalog(Array.isArray(cat) ? cat : []);
    } catch (err) {
      setError(errMsg(err, "Failed to load cycle."));
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

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
            {deptId && !locked ? (
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
                      {!locked ? <th className="px-3 py-2.5" /> : null}
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
                        {!locked ? (
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
        </div>
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
