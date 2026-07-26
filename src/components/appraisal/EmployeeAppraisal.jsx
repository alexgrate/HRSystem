import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Target,
  Plus,
  Check,
  X,
  Lock,
  Send,
  Pencil,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { TabPills } from "../ui/TabPills";
import { useToast, useConfirm } from "../ui/Notifications";
import { useAuth } from "../../context/AuthContext";
import {
  appraisalCycleService,
  appraisalTargetService,
  appraisalReviewService,
  appraisalSessionService,
} from "../../services/appraisalService";
import { administrationPeriodService } from "../../services/administrationPeriodService";

// The employee-facing side of the appraisal flow, hosted on the Self-Service
// page: set targets against the indicators for your job role, record your
// achievements when a review is called up, and see your ratings. The
// admin/manager side (sessions, locks, indicators, reports) stays on the
// Appraisals page.

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

// Appraisal-specific status chips: 'submitted'/'completed' are the positive states.
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
      <div className={`w-full ${maxW} max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
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

/* ============================================================ My Targets */

export function MyTargetsSection({ myDeptId, myJobRoleId, currentCycle, currentPeriod, targetLocks = [] }) {
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

  const periodActive = String(currentPeriod?.status || "").toLowerCase() === "active";
  // Targets are set while the cycle is 'active'; once a review session is
  // called up (reviewing) or the cycle closes, the target window is over.
  const cycleActive = currentCycle?.status ? currentCycle.status === "active" : true;
  // Once the department head locks in the department's targets they freeze,
  // and the department becomes eligible for admin-called review sessions.
  const deptLocked = !!myDeptId && targetLocks.some((l) => l.department_id === myDeptId);
  const canSetTargets = periodActive && cycleActive && !deptLocked;

  if (!currentCycle?.id) {
    return (
      <Card>
        <EmptyState Icon={Target} title="No active appraisal cycle" hint="Once an administrator starts the appraisal for the current administration period, the performance indicators for your job role will appear here." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!canSetTargets && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {deptLocked
              ? "Your department head has locked in your department's targets for this appraisal. Targets can no longer be added or changed."
              : !cycleActive
                ? currentCycle.status === "reviewing"
                  ? "A performance review is currently underway — targets are frozen while it is open."
                  : `The target window is closed — this appraisal cycle is now ${currentCycle.status}.`
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

export function MyReviewsSection({ myEmployeeId, currentCycle, sessions = [] }) {
  const [reviews, setReviews] = useState([]);
  const [myResult, setMyResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openReview, setOpenReview] = useState(null); // { id, selfAssess }

  const cycleId = currentCycle?.id || null;
  const finalSession = sessions.find((s) => s.session_type === "final") || null;
  const cycleFinalized = !!finalSession && finalSession.status === "closed";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await appraisalReviewService.list();
      // Reviews where I am the reviewed employee (not the reviewer).
      const mine = (Array.isArray(rows) ? rows : []).filter((r) => r.employee_id === myEmployeeId);
      setReviews(mine);
      if (cycleId && cycleFinalized) {
        const results = await appraisalSessionService.results(cycleId).catch(() => []);
        setMyResult((Array.isArray(results) ? results : []).find((r) => r.employee_id === myEmployeeId) || null);
      } else {
        setMyResult(null);
      }
    } catch (err) {
      setError(errMsg(err, "Failed to load your reviews."));
    } finally {
      setLoading(false);
    }
  }, [myEmployeeId, cycleId, cycleFinalized]);

  useEffect(() => {
    load();
  }, [load]);

  const openSession = sessions.find((s) => s.status === "open") || null;
  const myOpenReview = openSession
    ? reviews.find((r) => r.review_session_id === openSession.id && r.status === "in_progress") || null
    : null;

  const sessionLabel = (r) =>
    r.session_name || (r.session_type === "final" ? "Final performance review" : r.review_session_id ? "Performance review" : r.cycle_name || "Appraisal review");

  return (
    <div className="space-y-4">
      {myOpenReview && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <div className="text-sm font-bold text-ink">
                {openSession.session_type === "final" ? "Final performance review is open" : "A performance review is open"}
              </div>
              <p className="mt-0.5 max-w-xl text-xs text-ink-muted">
                Record what you achieved against each of your targets
                {openSession.session_type === "final" ? " for this administration period" : " so far"}. Your rating is
                computed automatically from your results.
              </p>
            </div>
          </div>
          <PrimaryBtn onClick={() => setOpenReview({ id: myOpenReview.id, selfAssess: true })}>
            Enter my results <ChevronRight className="h-4 w-4" />
          </PrimaryBtn>
        </div>
      )}

      {myResult && (
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Appraisal result · {currentCycle?.name || "Current period"}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line-soft bg-sunken/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Final review rating</div>
              <div className="mt-1 text-2xl font-bold text-ink">{myResult.final_rating != null ? pct(myResult.final_rating) : "—"}</div>
            </div>
            <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-brand">Overall rating (main)</div>
              <div className="mt-1 text-2xl font-bold text-ink">{myResult.overall_rating != null ? pct(myResult.overall_rating) : "—"}</div>
            </div>
            <div className="rounded-xl border border-line-soft bg-sunken/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">Reviews counted</div>
              <div className="mt-1 text-2xl font-bold text-ink">{myResult.sessions_counted ?? "—"}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">
            The overall rating averages every completed review in the period, including the final review.
          </p>
        </Card>
      )}

      <Card>
        <div className="border-b border-line-soft px-5 py-4">
          <h2 className="text-sm font-bold text-ink">My Performance Reviews</h2>
          <p className="text-xs text-ink-muted">
            When a review is called up, record your achievements against your targets to receive your rating.
          </p>
        </div>
        {loading ? (
          <Loading label="Loading your reviews…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : reviews.length === 0 ? (
          <EmptyState Icon={ClipboardCheck} title="No reviews yet" hint="When the administrator calls up a performance review for the period, it appears here for you to record your achievements." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Review</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">My rating</th>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => {
                  const editableNow = openSession && r.review_session_id === openSession.id && r.status === "in_progress";
                  return (
                    <tr key={r.id} className="border-t border-line-soft">
                      <td className="px-5 py-3 text-ink">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sessionLabel(r)}</span>
                          {r.session_type === "final" && (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">Final</span>
                          )}
                        </div>
                        {r.cycle_name && <div className="text-xs text-ink-faint">{r.cycle_name}</div>}
                      </td>
                      <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                      <td className="px-4 py-3 font-semibold text-ink">{r.overall_rating != null ? pct(r.overall_rating) : "—"}</td>
                      <td className="px-4 py-3 text-ink-muted">{fmtDate(r.self_submitted_at || r.reviewed_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <GhostBtn onClick={() => setOpenReview({ id: r.id, selfAssess: !!editableNow })}>
                          {editableNow ? "Enter results" : "View"} <ChevronRight className="h-3.5 w-3.5" />
                        </GhostBtn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {openReview && (
          <ReviewDetailModal
            reviewId={openReview.id}
            editable={false}
            selfAssess={openReview.selfAssess}
            asEmployee
            onClose={() => setOpenReview(null)}
            onChanged={load}
          />
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------- Review detail (shared) */
// Also used by the Appraisals page (Team Reviews) in reviewer/admin mode.

export function ReviewDetailModal({ reviewId, editable, selfAssess = false, asEmployee = false, onClose, onChanged }) {
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
  // Reviewer/admin scoring (editable) or the employee's own session
  // self-assessment (selfAssess) — both edit while the review is in progress.
  const canEdit = (editable || selfAssess) && isInProgress;

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
      toast.error(
        selfAssess
          ? "Save an achieved result for every indicator before submitting."
          : "Every indicator needs an achieved value before completing."
      );
      return;
    }
    const ok = await confirm({
      title: selfAssess ? "Submit your results?" : "Complete review?",
      message: selfAssess
        ? "This submits your achievements for this review and computes your overall weighted rating. You will not be able to change your results afterwards."
        : "This finalizes the review and computes the overall weighted rating. It cannot be reopened.",
      confirmLabel: selfAssess ? "Submit results" : "Complete review",
      danger: false,
    });
    if (!ok) return;
    setCompleting(true);
    try {
      const updated = await appraisalReviewService.complete(reviewId, reviewerComments);
      setReview(updated);
      toast.success(selfAssess ? "Results submitted — your rating is ready." : "Review completed.");
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
              <label className="block text-xs font-semibold text-ink-muted">
                {selfAssess ? "My comments (optional)" : "Reviewer comments (optional)"}
              </label>
              <textarea
                className={inputCls}
                rows={2}
                value={reviewerComments}
                onChange={(e) => setReviewerComments(e.target.value)}
                placeholder={selfAssess ? "Any context on your results for this period" : "Overall feedback for this review"}
              />
              <div className="flex justify-end">
                <PrimaryBtn onClick={complete} disabled={completing}>
                  <Check className="h-4 w-4" />{" "}
                  {completing
                    ? selfAssess ? "Submitting…" : "Completing…"
                    : selfAssess ? "Submit my results" : "Complete review"}
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

/* ================================================= Self-service entry point */

/**
 * Self-booting wrapper for the Self-Service page: loads the current cycle,
 * administration period, department target locks, and review sessions, then
 * offers the two employee views (targets + reviews) behind inner tabs.
 */
export default function EmployeeAppraisalTab() {
  const { user } = useAuth();
  const myEmployeeId = user?.id || null;
  const [currentCycle, setCurrentCycle] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [targetLocks, setTargetLocks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [booting, setBooting] = useState(true);
  const [inner, setInner] = useState("targets");

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const [cycle, period] = await Promise.all([
          appraisalCycleService.current().catch(() => null),
          administrationPeriodService.current().catch(() => null),
        ]);
        let locks = [];
        let sess = [];
        if (cycle?.id) {
          [locks, sess] = await Promise.all([
            appraisalCycleService.listTargetLocks(cycle.id).catch(() => []),
            appraisalSessionService.list(cycle.id).catch(() => []),
          ]);
        }
        if (stale) return;
        setCurrentCycle(cycle || null);
        setCurrentPeriod(period || null);
        setTargetLocks(Array.isArray(locks) ? locks : []);
        setSessions(Array.isArray(sess) ? sess : []);
      } finally {
        if (!stale) setBooting(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  if (booting) {
    return (
      <Card>
        <Loading label="Loading your appraisal…" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <TabPills
        layoutId="ess-appraisal-tab"
        active={inner}
        onChange={setInner}
        tabs={[
          { key: "targets", label: "My Targets", Icon: Target },
          { key: "reviews", label: "My Reviews", Icon: ClipboardCheck },
        ]}
      />
      {inner === "targets" && (
        <MyTargetsSection
          myDeptId={user?.department_id || null}
          myJobRoleId={user?.job_role_id || null}
          currentCycle={currentCycle}
          currentPeriod={currentPeriod}
          targetLocks={targetLocks}
        />
      )}
      {inner === "reviews" && (
        <MyReviewsSection myEmployeeId={myEmployeeId} currentCycle={currentCycle} sessions={sessions} />
      )}
    </div>
  );
}
