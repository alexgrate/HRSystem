import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Users, Layers, Inbox, Wallet, UserPlus, CalendarDays, ShieldCheck, Briefcase,
  MapPin, BadgeCheck, TrendingUp, Banknote, Target, Activity, AlertCircle,
  ChevronRight, CircleUser, FileText, Bell, ListTodo, HeartPulse, Cake,
  CheckCircle2, Gift, RotateCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionContext";
import { useConfig } from "../context/ConfigContext";
import { setupService } from "../services/setupService";
import { approvalService } from "../services/approvalService";
import { payrollService } from "../services/payrollService";
import { loanService } from "../services/loanService";
import { leaveService } from "../services/leaveService";
import { orgService } from "../services/orgService";
import { appraisalCycleService, appraisalReviewService } from "../services/appraisalService";
import { RESOURCE_CODES } from "../config/resourceCodes";
import { getEmployeeName } from "../utils/employee";
import { fmtMoney, runStatusMeta } from "../utils/payroll";
import { useNotifications } from "../context/NotificationContext";
import { groupByRecency } from "../utils/notifications";
import api from "../services/api";


const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const greetingFor = (h) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const fmtWhen = (v) => {
  if (!v) return "";
  const d = new Date(v); if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < day) return `${Math.round(diff / 3600000)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  return fmtDate(v);
};
const titleCase = (s) => String(s || "").replace(/[_.-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();
const inclusiveDays = (start, end) => {
  const a = new Date(start), b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
};
const isActiveLoan = (s) => ["active", "disbursed", "approved"].includes(String(s || "").toLowerCase());


function useDomain(fetcher, enabled = true, deps = []) {
  const [state, setState] = useState({ loading: enabled, error: null, data: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    if (!enabled) { setState({ loading: false, error: null, data: null }); return; }
    setState((s) => ({ ...s, loading: true, error: null }));
    try { setState({ loading: false, error: null, data: await fetcher() }); }
    catch (e) { setState({ loading: false, error: e?.message || "Failed to load.", data: null }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

/* ------------------------------------------------------------- UI primitives */

const chip = (tone) =>
  ({
    ok: "bg-emerald-50 text-emerald-700", warn: "bg-amber-50 text-amber-700",
    info: "bg-sky-50 text-sky-700", muted: "bg-sunken text-ink-muted",
    brand: "bg-brand/10 text-brand", danger: "bg-red-50 text-red-700",
  }[tone] || "bg-sunken text-ink-muted");

const StatusPill = ({ label, tone = "muted" }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip(tone)}`}>{label}</span>
);

// Subtle one-shot appearance animation; a no-op under prefers-reduced-motion.
// Forwards extra props (e.g. aria-label) so semantics are preserved.
function Reveal({ children, delay = 0, className = "", ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} {...rest}>{children}</div>;
  return (
    <motion.div className={className} {...rest} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

// Integer counter that animates ONCE on first mount (per PHASE 8 "only once
// during initial load"); later value changes update instantly, and it's static
// under prefers-reduced-motion.
function Count({ value = 0 }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  const raf = useRef(0);
  const animated = useRef(false);
  useEffect(() => {
    if (reduce || animated.current) { setN(value); return undefined; }
    animated.current = true;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 600);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, reduce]);
  return <>{n}</>;
}

function Widget({ title, Icon, to, action, loading, error, empty, emptyHint, onRetry, children, className = "" }) {
  const navigate = useNavigate();
  const headingId = `w-${String(title).replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className={`flex min-w-0 flex-col rounded-2xl border border-line/80 bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand"><Icon className="h-4 w-4" aria-hidden="true" /></div>}
          <h3 id={headingId} className="text-sm font-bold text-ink">{title}</h3>
        </div>
        {to && (
          <button onClick={() => navigate(to)} className="inline-flex shrink-0 items-center gap-0.5 rounded text-[11px] font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            {action || "View"} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading {title}…</span>
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-sunken" />
            <div className="h-4 w-full animate-pulse rounded bg-sunken/70" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-sunken/70" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 text-xs text-red-600" role="alert">
            <span className="inline-flex items-center gap-1"><AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}</span>
            {onRetry && <button onClick={onRetry} className="rounded-lg border border-line px-2.5 py-1.5 font-semibold text-ink hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Retry</button>}
          </div>
        ) : empty ? (
          <div className="py-3 text-xs text-ink-faint">{emptyHint || "Nothing to show yet."}</div>
        ) : children}
      </div>
    </section>
  );
}

const Stat = ({ label, value, sub, tone }) => (
  <div className="min-w-0">
    <div className="text-2xl font-bold tracking-tight text-ink">{value}</div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
    {sub != null && <div className={`mt-0.5 truncate text-xs ${tone === "warn" ? "text-amber-600" : "text-ink-muted"}`}>{sub}</div>}
  </div>
);

const KV = ({ label, value, Icon }) => (
  <div className="flex min-w-0 items-start gap-2">
    {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />}
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="truncate text-sm font-medium text-ink">{value || "—"}</div>
    </div>
  </div>
);


const PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444"];

function Donut({ segments, size = 128, thickness = 16 }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Distribution: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total === 0 ? (
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={thickness} />
          ) : segments.map((seg, i) => {
            const dash = ((Number(seg.value) || 0) / total) * c;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={thickness} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} />;
            offset += dash; return el;
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="fill-ink" style={{ fontSize: 22, fontWeight: 700 }}>{total}</text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1 }}>TOTAL</text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.slice(0, 6).map((seg, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{seg.label}</span>
            <span className="font-semibold text-ink">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendBars({ points, format = (v) => v }) {
  const max = Math.max(1, ...points.map((p) => Number(p.value) || 0));
  return (
    <div className="flex items-end gap-2" style={{ height: 96 }}>
      {points.map((p, i) => {
        const h = Math.max(3, Math.round(((Number(p.value) || 0) / max) * 84));
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end overflow-hidden rounded-t-md bg-brand/15" style={{ height: 84 }} title={`${p.label}: ${format(p.value)}`}>
              <div className="w-full rounded-t-md bg-brand" style={{ height: h }} />
            </div>
            <span className="truncate text-[9px] text-ink-faint">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatusBar({ segments }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-sunken">
        {segments.map((s, i) => <div key={i} style={{ width: `${((Number(s.value) || 0) / total) * 100}%`, background: PALETTE[i % PALETTE.length] }} title={`${s.label}: ${s.value}`} />)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="h-2 w-2 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" /> {s.label} <b className="text-ink">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ self widgets */

function EmploymentSummary({ profile, loading, deptName, roleName, personName, className }) {
  const p = profile || {};
  return (
    <Widget title="Employment summary" Icon={CircleUser} to="/app/self-service" action="My profile"
      className={className} loading={loading} empty={!loading && !profile} emptyHint="Couldn't load your profile. Refresh to try again.">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <KV label="Staff ID" value={p.staff_id} Icon={BadgeCheck} />
        <KV label="Department" value={deptName(p.department_id)} Icon={Layers} />
        <KV label="Job role" value={roleName(p.job_role_id)} Icon={Briefcase} />
        <KV label="Level" value={p.level} Icon={TrendingUp} />
        <KV label="Manager" value={personName(p.manager_id)} Icon={Users} />
        <KV label="Status" value={titleCase(p.employment_status || p.status)} Icon={BadgeCheck} />
        <KV label="Contract" value={titleCase(p.contract_type)} Icon={FileText} />
        <KV label="Hire date" value={fmtDate(p.start_date)} Icon={CalendarDays} />
        <KV label="Location" value={p.report_location_name || p.report_location} Icon={MapPin} />
      </div>
    </Widget>
  );
}

function MyLeave({ leave, types }) {
  const navigate = useNavigate();
  const mine = leave.data || [];
  const committedByType = useMemo(() => {
    const m = {};
    for (const r of mine) {
      const st = String(r.status || "").toLowerCase();
      if (st !== "approved" && st !== "pending_approval") continue;
      m[r.leave_type_id] = (m[r.leave_type_id] || 0) + inclusiveDays(r.start_date, r.end_date);
    }
    return m;
  }, [mine]);
  const balances = (types.data || []).map((t) => {
    const used = committedByType[t.id] || 0;
    return { name: t.name, allowed: Number(t.days_allowed) || 0, remaining: Math.max(0, (Number(t.days_allowed) || 0) - used) };
  });
  const pending = mine.filter((r) => String(r.status || "").toLowerCase() === "pending_approval").length;
  const next = mine.filter((r) => String(r.status || "").toLowerCase() === "approved" && String(r.start_date) >= todayISO())
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0];
  return (
    <Widget title="My leave" Icon={CalendarDays} to="/app/self-service" action="Apply"
      loading={leave.loading || types.loading} error={leave.error} onRetry={() => { leave.reload(); types.reload(); }}
      empty={!leave.loading && !types.loading && !leave.error && balances.length === 0 && mine.length === 0} emptyHint="No leave types available to you yet.">
      <div className="space-y-3">
        <ul className="space-y-1.5">
          {balances.slice(0, 3).map((b, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-ink-muted">{b.name}</span>
              <span className="shrink-0 font-semibold text-ink">{b.remaining}<span className="text-ink-faint">/{b.allowed} left</span></span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-2 text-xs">
          <span className="text-ink-muted">Pending: <b className="text-ink">{pending}</b></span>
          <span className="text-ink-muted">Next: <b className="text-ink">{next ? fmtDate(next.start_date) : "None"}</b></span>
        </div>
        <button onClick={() => navigate("/app/self-service")} className="w-full rounded-lg border border-line py-2 text-xs font-semibold text-brand hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Apply for leave</button>
      </div>
    </Widget>
  );
}

function MyPayroll({ payslips }) {
  const navigate = useNavigate();
  const slips = payslips.data || [];
  const latest = useMemo(() => [...slips].sort((a, b) => {
    const ra = a.run || {}, rb = b.run || {};
    return (rb.year - ra.year) || (rb.month - ra.month) || String(b.created_at).localeCompare(String(a.created_at));
  })[0] || null, [slips]);
  const run = latest?.run || {};
  const meta = run.status ? runStatusMeta(run.status) : null;
  return (
    <Widget title="My payroll" Icon={Wallet} to="/app/self-service" action="Payslips"
      loading={payslips.loading} error={payslips.error} onRetry={payslips.reload}
      empty={!payslips.loading && !payslips.error && !latest} emptyHint="Your payslips will appear here once payroll is distributed.">
      {latest && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="text-2xl font-bold tracking-tight text-ink">{fmtMoney(latest.net_salary, latest.currency)}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Net pay · {MONTHS[(run.month || 1) - 1]} {run.year}</div>
            </div>
            {meta && <StatusPill label={meta.label} tone={run.status === "distributed" ? "ok" : "info"} />}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-2 text-xs">
            <span className="text-ink-muted">Gross: <b className="text-ink">{fmtMoney(latest.gross_salary, latest.currency)}</b></span>
            <span className="text-ink-muted">Deductions: <b className="text-ink">{fmtMoney(latest.deductions_total, latest.currency)}</b></span>
          </div>
          <button onClick={() => navigate("/app/self-service")} className="w-full rounded-lg border border-line py-2 text-xs font-semibold text-brand hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">View payslip</button>
        </div>
      )}
    </Widget>
  );
}

function MyLoans({ loans }) {
  const navigate = useNavigate();
  const active = useMemo(() => (loans.data || []).filter((l) => isActiveLoan(l.status)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0], [loans.data]);
  return (
    <Widget title="My loans" Icon={Banknote} to="/app/self-service" action="Loans"
      loading={loans.loading} error={loans.error} onRetry={loans.reload}
      empty={!loans.loading && !loans.error && !active} emptyHint="No active loan.">
      {active && (() => {
        const outstanding = Math.max(0, Number(active.total_repayable || 0) - Number(active.amount_repaid || 0));
        const inst = Number(active.monthly_installment || 0);
        const remaining = inst > 0 ? Math.ceil(outstanding / inst) : null;
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="text-2xl font-bold tracking-tight text-ink">{fmtMoney(outstanding)}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Outstanding balance</div>
              </div>
              <StatusPill label={titleCase(active.status)} tone={String(active.status).toLowerCase() === "active" ? "info" : "muted"} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-2 text-xs">
              <span className="text-ink-muted">Installment: <b className="text-ink">{fmtMoney(inst)}</b></span>
              {remaining != null && <span className="text-ink-muted">Remaining: <b className="text-ink">{remaining} mo</b></span>}
            </div>
          </div>
        );
      })()}
      {!loans.loading && !loans.error && !active && (
        <button onClick={() => navigate("/app/self-service")} className="mt-2 w-full rounded-lg border border-line py-2 text-xs font-semibold text-brand hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Apply for a loan</button>
      )}
    </Widget>
  );
}

function MyAppraisal({ reviews, cycle, myEmployeeId }) {
  const mine = useMemo(() => (reviews.data || []).filter((r) => r.employee_id === myEmployeeId).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0], [reviews.data, myEmployeeId]);
  const cyc = cycle.data;
  return (
    <Widget title="My appraisal" Icon={Target} to="/app/appraisals" action="Open"
      loading={reviews.loading || cycle.loading} error={reviews.error} onRetry={() => { reviews.reload(); cycle.reload(); }}
      empty={!reviews.loading && !cycle.loading && !reviews.error && !cyc && !mine} emptyHint="No appraisal cycle is active right now.">
      <div className="space-y-2 text-sm">
        {cyc && (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-ink-muted">{cyc.name || "Current cycle"}</span>
            <StatusPill label={titleCase(cyc.status)} tone="brand" />
          </div>
        )}
        {mine ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">My review</span>
              <StatusPill label={titleCase(mine.status)} tone={mine.status === "acknowledged" ? "ok" : "info"} />
            </div>
            {mine.overall_rating != null && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Latest score</span>
                <span className="font-bold text-ink">{Math.round(Number(mine.overall_rating) * 10) / 10}%</span>
              </div>
            )}
            {mine.status === "published" && <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">Action needed: acknowledge your published review.</div>}
          </>
        ) : cyc ? <div className="text-xs text-ink-faint">No review has been called up for you in this cycle yet.</div> : null}
      </div>
    </Widget>
  );
}

const PRIORITY = { high: { rank: 0, label: "High", tone: "danger" }, medium: { rank: 1, label: "Medium", tone: "warn" }, low: { rank: 2, label: "Low", tone: "info" } };

function MyTasks({ profile, reviews, approvals, payroll, orgStats, myEmployeeId, roleFlags }) {
  const navigate = useNavigate();
  const { isManager, canApprovals, canPayroll, isHR } = roleFlags;
  const [limit, setLimit] = useState(5);
  const loading = reviews.loading || (canApprovals && approvals.loading) || (canPayroll && payroll.loading);

  // Every task carries priority + originating module + a status, and navigates.
  const tasks = useMemo(() => {
    const t = [];
    const revs = reviews.data || [];
    const p = profile || {};
    const missing = ["department_id", "job_role_id", "start_date"].filter((k) => !p[k]);
    if (profile && missing.length) t.push({ key: "profile", priority: "low", module: "Profile", label: "Complete your profile", status: `${missing.length} field${missing.length > 1 ? "s" : ""} missing`, to: "/app/self-service" });
    const myPublished = revs.filter((r) => r.employee_id === myEmployeeId && r.status === "published").length;
    if (myPublished) t.push({ key: "ack", priority: "high", module: "Appraisals", label: "Acknowledge your appraisal", status: "Awaiting you", to: "/app/appraisals" });
    if (isManager) {
      const scoring = revs.filter((r) => r.reviewer_employee_id === myEmployeeId && r.status === "in_progress").length;
      if (scoring) t.push({ key: "score", priority: "high", module: "Appraisals", label: `Score ${scoring} team review${scoring > 1 ? "s" : ""}`, status: "In progress", to: "/app/appraisals" });
    }
    if (canApprovals && approvals.data) {
      const a = approvals.data, tot = (a.leave || 0) + (a.docs || 0) + (a.profile || 0);
      if (tot) t.push({ key: "approvals", priority: "high", module: "Approvals", label: `Review ${tot} pending approval${tot > 1 ? "s" : ""}`, status: "Pending", to: "/app/approvals" });
    }
    if (canPayroll && payroll.data) {
      const awaiting = (payroll.data.runs || []).filter((r) => String(r.status || "").includes("pending_approval")).length;
      if (awaiting) t.push({ key: "payrun", priority: "high", module: "Payroll", label: `${awaiting} payroll run${awaiting > 1 ? "s" : ""} awaiting action`, status: "In pipeline", to: "/app/payroll" });
      const adj = (payroll.data.adjustments || []).filter((a) => String(a.status || "").toLowerCase() === "pending_approval").length;
      if (adj) t.push({ key: "adj", priority: "medium", module: "Payroll", label: `${adj} adjustment${adj > 1 ? "s" : ""} to review`, status: "Pending", to: "/app/payroll" });
    }
    if (isHR && orgStats.data?.incomplete) {
      const inc = orgStats.data.incomplete;
      const gap = Math.max(inc.no_manager || 0, inc.no_pay_grade || 0, inc.no_department || 0, inc.no_job_role || 0, inc.no_office || 0);
      if (gap) t.push({ key: "records", priority: "medium", module: "Directory", label: "Complete employee records", status: "Missing setup", to: "/app/directory" });
    }
    return t.sort((a, b) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank);
  }, [profile, reviews.data, approvals.data, payroll.data, orgStats.data, myEmployeeId, isManager, canApprovals, canPayroll, isHR]);

  const shown = tasks.slice(0, limit);
  const groups = ["high", "medium", "low"].map((pk) => ({ pk, items: shown.filter((t) => t.priority === pk) })).filter((g) => g.items.length);

  return (
    <Widget title="My tasks" Icon={ListTodo} loading={loading} empty={!loading && tasks.length === 0} emptyHint="Everything is complete — nothing needs your action.">
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.pk}>
            <div className="mb-1 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${chip(PRIORITY[g.pk].tone)}`}>{PRIORITY[g.pk].label}</span>
            </div>
            <ul className="space-y-2">
              {g.items.map((t) => (
                <li key={t.key}>
                  <button onClick={() => navigate(t.to)} className="flex w-full items-center gap-3 rounded-xl border border-line-soft px-3 py-2.5 text-left transition hover:border-brand/30 hover:bg-sunken/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chip(PRIORITY[t.priority].tone)}`}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{t.label}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-faint">
                        <span className="rounded bg-sunken px-1.5 py-0.5 font-semibold text-ink-muted">{t.module}</span>
                        <span>{t.status}</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-ghost" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {tasks.length > limit && (
          <button onClick={() => setLimit((n) => n + 5)} className="w-full rounded-lg border border-line py-2 text-xs font-semibold text-brand hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            Load more ({tasks.length - limit} more)
          </button>
        )}
      </div>
    </Widget>
  );
}

/* ============================================================ Notifications */

const NOTIF_ICON = {
  leave: CalendarDays, loan: Banknote, payroll: Wallet, appraisal: Target,
  appeal: Target, people: Users, document: FileText, setup: Layers,
  org: ShieldCheck, approval: Inbox, generic: Bell,
};

// Consumes the shared NotificationProvider (same source as the header badge).
// Newest-first, grouped by recency, 5 shown initially + Load More (+5).
function Notifications() {
  const navigate = useNavigate();
  const { notifications, readSet, loading, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const [limit, setLimit] = useState(5);

  const shown = notifications.slice(0, limit);
  const groups = groupByRecency(shown);
  const open = (i) => { markRead(i.id); navigate(i.route || "/app"); };

  return (
    <Widget title="Notifications" Icon={Bell} loading={loading && notifications.length === 0} onRetry={refresh}
      empty={!loading && notifications.length === 0} emptyHint="You're all caught up — no new notifications.">
      <div className="space-y-3">
        {unreadCount > 0 && (
          <div className="flex items-center justify-between">
            <StatusPill label={`${unreadCount} unread`} tone="brand" />
            <button onClick={markAllRead} className="rounded text-[11px] font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Mark all read</button>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{g.label}</div>
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const Icon = NOTIF_ICON[i.iconKey] || Bell;
                const isRead = readSet.has(i.id);
                return (
                  <li key={i.id}>
                    <button onClick={() => open(i)} className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-sunken/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${isRead ? "bg-sunken text-ink-faint" : "bg-brand/10 text-brand"}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${isRead ? "text-ink-muted" : "font-semibold text-ink"}`}>{i.title}</span>
                        <span className="block truncate text-[11px] text-ink-faint">{i.description ? `${i.description} · ` : ""}{fmtWhen(i.at)}</span>
                      </span>
                      {!isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {notifications.length > limit && (
          <button onClick={() => setLimit((n) => n + 5)} className="w-full rounded-lg border border-line py-2 text-xs font-semibold text-brand hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            Load more ({notifications.length - limit} more)
          </button>
        )}
      </div>
    </Widget>
  );
}

/* ============================================================ Upcoming events */

function UpcomingEvents({ leave, orgStats, isHR }) {
  const events = useMemo(() => {
    const out = [];
    const today = todayISO();
    // Own leave starting soon (next 45 days), approved.
    for (const l of (leave.data || [])) {
      if (String(l.status || "").toLowerCase() !== "approved") continue;
      if (String(l.start_date) < today) continue;
      const days = inclusiveDays(today, l.start_date) - 1;
      if (days <= 45) out.push({ key: `lv-${l.id}`, Icon: CalendarDays, title: `${l.leave_type_name || "Leave"} starts`, date: l.start_date, days });
    }
    // Upcoming birthdays (HR only, from the aggregate).
    if (isHR) {
      for (const b of (orgStats.data?.upcoming_birthdays || [])) {
        out.push({ key: `bd-${b.id}`, Icon: Gift, title: `${[b.firstname, b.lastname].filter(Boolean).join(" ") || "Employee"}'s birthday`, days: b.days_until, tone: "brand" });
      }
    }
    return out.sort((a, b) => (a.days ?? 999) - (b.days ?? 999)).slice(0, 8);
  }, [leave.data, orgStats.data, isHR]);
  const loading = leave.loading || (isHR && orgStats.loading);
  return (
    <Widget title="Upcoming events" Icon={Cake} loading={loading} empty={!loading && events.length === 0} emptyHint="Nothing on the calendar in the next few weeks.">
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.key} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><e.Icon className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
              <span className="block text-[11px] text-ink-faint">{e.date ? fmtDate(e.date) : ""}{e.date ? " · " : ""}{e.days === 0 ? "Today" : `in ${e.days} day${e.days === 1 ? "" : "s"}`}</span>
            </span>
          </li>
        ))}
      </ul>
    </Widget>
  );
}

/* ============================================================ Org health */

function OrgHealth({ orgStats, configGaps, cycle, payroll, canPayroll }) {
  const d = orgStats.data;
  const issues = useMemo(() => {
    const list = [];
    const inc = d?.incomplete || {};
    if (inc.no_manager) list.push({ label: `${inc.no_manager} without a manager`, sev: "warn", to: "/app/directory" });
    if (inc.no_department) list.push({ label: `${inc.no_department} without a department`, sev: "warn", to: "/app/directory" });
    if (inc.no_pay_grade) list.push({ label: `${inc.no_pay_grade} without a pay grade`, sev: "critical", to: "/app/directory" });
    if (inc.no_job_role) list.push({ label: `${inc.no_job_role} without a job role`, sev: "warn", to: "/app/directory" });
    if (inc.no_office) list.push({ label: `${inc.no_office} without an office`, sev: "warn", to: "/app/directory" });
    (configGaps.data || []).forEach((g) => list.push(g));
    // Derived from already-fetched domains (no extra request).
    if (!cycle.loading && !cycle.error && !cycle.data) list.push({ label: "No active appraisal cycle", sev: "warn", to: "/app/appraisals" });
    if (canPayroll && payroll.data && !(payroll.data.runs || []).length) list.push({ label: "No payroll run has been created", sev: "warn", to: "/app/payroll" });
    return list;
  }, [d, configGaps.data, cycle.loading, cycle.error, cycle.data, canPayroll, payroll.data]);
  const critical = issues.filter((i) => i.sev === "critical").length;
  const status = !d ? "—" : critical ? "Critical" : issues.length ? "Needs attention" : "Healthy";
  const statusTone = critical ? "danger" : issues.length ? "warn" : "ok";
  const navigate = useNavigate();
  return (
    <Widget title="Organization health" Icon={HeartPulse} loading={orgStats.loading || configGaps.loading} error={orgStats.error} onRetry={() => { orgStats.reload(); configGaps.reload(); }}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-ink-muted">Configuration status</span>
          <StatusPill label={status} tone={statusTone} />
        </div>
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Everything is configured.</div>
        ) : (
          <ul className="space-y-1.5">
            {issues.slice(0, 6).map((i, idx) => (
              <li key={idx}>
                <button onClick={() => navigate(i.to)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-sunken/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${i.sev === "critical" ? "bg-red-500" : "bg-amber-500"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-ghost" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Widget>
  );
}

/* ============================================================ manager / org */

function ManagerTeam({ myReports, personName, reviews, myEmployeeId }) {
  const inProgress = (reviews.data || []).filter((r) => r.reviewer_employee_id === myEmployeeId && r.status === "in_progress").length;
  return (
    <Widget title="My team" Icon={Users} to="/app/appraisals" action="Team reviews" loading={reviews.loading} error={reviews.error} onRetry={reviews.reload}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
          <Stat label="Direct reports" value={myReports.length} />
          <Stat label="Reviews in progress" value={inProgress} tone={inProgress > 0 ? "warn" : undefined} sub={inProgress > 0 ? "awaiting scoring" : "up to date"} />
        </div>
        {myReports.length > 0 && (
          <div className="border-t border-line-soft pt-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Roster</div>
            <div className="flex flex-wrap gap-1.5">
              {myReports.slice(0, 8).map((r) => <span key={r.id} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-muted">{personName(r.id)}</span>)}
              {myReports.length > 8 && <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-faint">+{myReports.length - 8}</span>}
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
}

function OrgStats({ orgStats }) {
  const d = orgStats.data;
  return (
    <Widget title="Workforce" Icon={Users} to="/app/directory" action="Directory" loading={orgStats.loading} error={orgStats.error} onRetry={orgStats.reload}>
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Headcount" value={d.total} />
            <Stat label="Active" value={d.active} />
            <Stat label="On probation" value={d.on_probation} tone={d.on_probation > 0 ? "warn" : undefined} />
            <Stat label="Confirmed" value={d.confirmed} />
          </div>
          {(d.department_distribution || []).length > 0 && (
            <div className="border-t border-line-soft pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">By department</div>
              <Donut segments={d.department_distribution.map((x) => ({ label: x.department_name || "Unassigned", value: x.count }))} />
            </div>
          )}
          {(d.recent_hires || []).length > 0 && (
            <div className="border-t border-line-soft pt-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Recent hires</div>
              <ul className="space-y-1">
                {d.recent_hires.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-ink">{[h.firstname, h.lastname].filter(Boolean).join(" ") || "—"}<span className="text-ink-faint"> · {h.department_name || "—"}</span></span>
                    <span className="shrink-0 text-xs text-ink-muted">{fmtDate(h.start_date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}

function PendingApprovals({ approvals }) {
  const a = approvals.data || { leave: 0, docs: 0, profile: 0 };
  const total = (a.leave || 0) + (a.docs || 0) + (a.profile || 0);
  return (
    <Widget title="Pending approvals" Icon={Inbox} to="/app/approvals" action="Inbox" loading={approvals.loading} error={approvals.error} onRetry={approvals.reload}
      empty={!approvals.loading && !approvals.error && total === 0} emptyHint="No items waiting on you. All clear.">
      <div className="space-y-3">
        <Stat label="Awaiting action" value={total} tone={total > 0 ? "warn" : undefined} />
        <div className="flex flex-wrap gap-2">
          {a.leave > 0 && <StatusPill label={`Leave: ${a.leave}`} tone="warn" />}
          {a.docs > 0 && <StatusPill label={`Documents: ${a.docs}`} tone="warn" />}
          {a.profile > 0 && <StatusPill label={`Profile: ${a.profile}`} tone="warn" />}
        </div>
      </div>
    </Widget>
  );
}

function AppraisalOverview({ report }) {
  const r = report.data;
  const byStatus = r?.by_status || {};
  const segs = Object.entries(byStatus).map(([k, v]) => ({ label: titleCase(k), value: v }));
  return (
    <Widget title="Appraisals" Icon={Target} to="/app/appraisals" action="Reports" loading={report.loading} error={report.error} onRetry={report.reload}
      empty={!report.loading && !report.error && (!r || r.total_reviews === 0)} emptyHint="No appraisals to summarise yet.">
      {r && r.total_reviews > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Completion" value={`${r.completion_percentage ?? 0}%`} />
            <Stat label="Avg score" value={r.average_score != null ? `${r.average_score}%` : "—"} />
            <Stat label="Appeals" value={r.appeals_total ?? 0} tone={(r.appeals_total || 0) > 0 ? "warn" : undefined} />
          </div>
          {segs.length > 0 && <div className="border-t border-line-soft pt-3"><StatusBar segments={segs} /></div>}
        </div>
      )}
    </Widget>
  );
}

function PayrollOverview({ payroll }) {
  const runs = useMemo(() => [...(payroll.data?.runs || [])].sort((a, b) => (b.year - a.year) || (b.month - a.month)), [payroll.data]);
  const latest = runs[0];
  const pendingAdj = (payroll.data?.adjustments || []).filter((a) => String(a.status || "").toLowerCase() === "pending_approval").length;
  const trend = runs.slice(0, 6).reverse().map((r) => ({ label: MONTHS[(r.month || 1) - 1], value: Number(r.total_net) || 0 }));
  const meta = latest?.status ? runStatusMeta(latest.status) : null;
  return (
    <Widget title="Payroll" Icon={Wallet} to="/app/payroll" action="Open" loading={payroll.loading} error={payroll.error} onRetry={payroll.reload}
      empty={!payroll.loading && !payroll.error && !latest} emptyHint="No payroll has run yet — start one to see it here.">
      {latest && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-bold text-ink">{MONTHS[(latest.month || 1) - 1]} {latest.year}</div>
              <div className="text-[11px] text-ink-muted">{latest.total_employees} employees · {fmtMoney(latest.total_net, latest.currency)} net</div>
            </div>
            {meta && <StatusPill label={meta.label} tone={latest.status === "distributed" ? "ok" : "info"} />}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-ink-muted">Gross: <b className="text-ink">{fmtMoney(latest.total_gross, latest.currency)}</b></span>
            <span className="text-ink-muted">Pending adj.: <b className={pendingAdj > 0 ? "text-amber-600" : "text-ink"}>{pendingAdj}</b></span>
          </div>
          {trend.length > 1 && (
            <div className="border-t border-line-soft pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Net pay trend</div>
              <TrendBars points={trend} format={(v) => fmtMoney(v, latest.currency)} />
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}

const MiniCard = ({ label, value, tone }) => (
  <div className="rounded-xl border border-line-soft bg-sunken/30 px-3 py-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
    <div className={`mt-0.5 text-lg font-bold tracking-tight ${tone === "warn" ? "text-amber-600" : "text-ink"}`}>{value}</div>
  </div>
);

function LoanPortfolio({ portfolio }) {
  const navigate = useNavigate();
  const loans = portfolio.data || [];
  const m = useMemo(() => {
    const active = loans.filter((l) => isActiveLoan(l.status));
    const completed = loans.filter((l) => ["repaid", "completed", "closed"].includes(String(l.status || "").toLowerCase()));
    const pending = loans.filter((l) => String(l.status || "").toLowerCase() === "pending_approval");
    const outstanding = active.reduce((s, l) => s + Math.max(0, Number(l.total_repayable || 0) - Number(l.amount_repaid || 0)), 0);
    // Recovery rate = repaid / total repayable across every disbursed loan.
    const disbursed = loans.filter((l) => Number(l.total_repayable || 0) > 0);
    const totRepayable = disbursed.reduce((s, l) => s + Number(l.total_repayable || 0), 0);
    const totRepaid = disbursed.reduce((s, l) => s + Number(l.amount_repaid || 0), 0);
    const recovery = totRepayable > 0 ? Math.round((totRepaid / totRepayable) * 1000) / 10 : null;
    const recent = [...loans].sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at))).slice(0, 3);
    return { active, completed, pending, outstanding, recovery, recent };
  }, [loans]);

  return (
    <Widget title="Loan portfolio" Icon={Banknote} to="/app/loans" action="Open" loading={portfolio.loading} error={portfolio.error} onRetry={portfolio.reload}
      empty={!portfolio.loading && !portfolio.error && loans.length === 0} emptyHint="No loans have been recorded yet.">
      <div className="space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <MiniCard label="Outstanding" value={fmtMoney(m.outstanding)} />
          <MiniCard label="Recovery rate" value={m.recovery != null ? `${m.recovery}%` : "—"} />
        </div>
        {/* Status breakdown */}
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Status breakdown</div>
          <div className="grid grid-cols-3 gap-2">
            <MiniCard label="Active" value={m.active.length} />
            <MiniCard label="Completed" value={m.completed.length} />
            <MiniCard label="Pending" value={m.pending.length} tone={m.pending.length > 0 ? "warn" : undefined} />
          </div>
        </div>
        {/* Recent activity */}
        {m.recent.length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Recent activity</div>
            <ul className="space-y-1">
              {m.recent.map((l) => (
                <li key={l.id}>
                  <button onClick={() => navigate("/app/loans")} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-sunken/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                    <span className="min-w-0 truncate text-ink">{fmtMoney(l.amount)}<span className="text-ink-faint"> · {titleCase(l.status)}</span></span>
                    <span className="shrink-0 text-xs text-ink-muted">{fmtWhen(l.updated_at || l.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Widget>
  );
}

/* ============================================================ quick actions */

function QuickActions({ can, isAdmin }) {
  const navigate = useNavigate();
  const groups = useMemo(() => {
    const g = [
      { name: "People", actions: [
        { label: "Onboard employee", to: "/app/directory", show: can(RESOURCE_CODES.EMPLOYEES, "create") },
        { label: "Directory", to: "/app/directory", show: isAdmin || can(RESOURCE_CODES.EMPLOYEES, "read") },
      ] },
      { name: "Self-service", actions: [
        { label: "Apply for leave", to: "/app/self-service", show: true },
        { label: "Apply for loan", to: "/app/self-service", show: true },
      ] },
      { name: "Approvals", actions: [
        { label: "Review approvals", to: "/app/approvals", show: can([RESOURCE_CODES.LEAVE_REQUESTS, RESOURCE_CODES.DOCUMENTS, RESOURCE_CODES.PROFILE_UPDATE], "read") },
      ] },
      { name: "Payroll", actions: [
        { label: "Run payroll", to: "/app/payroll", show: can(RESOURCE_CODES.PAYROLL, "create") },
        { label: "Payroll runs", to: "/app/payroll", show: can(RESOURCE_CODES.PAYROLL, "read") },
      ] },
      { name: "Settings", actions: [
        { label: "Manage access", to: "/app/settings", show: can(RESOURCE_CODES.ROLE_PERMISSIONS, "read") },
        { label: "Getting started", to: "/app/setup", show: can(RESOURCE_CODES.SETUP, "create") },
      ] },
    ];
    return g.map((grp) => ({ ...grp, actions: grp.actions.filter((a) => a.show) })).filter((grp) => grp.actions.length);
  }, [can, isAdmin]);

  if (!groups.length) return null;
  return (
    <section aria-label="Quick actions" className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">Quick actions</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {groups.map((grp) => (
          <div key={grp.name} className="min-w-0">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">{grp.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {grp.actions.map((a) => (
                <button key={a.label} onClick={() => navigate(a.to)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-sunken/40 px-3 py-2 text-xs font-semibold text-ink-2 transition-all hover:border-brand/40 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ==================================================================== page */

const DashboardPage = () => {
  const { user } = useAuth();
  const { can, isAdmin, ready } = usePermissions();
  const { config } = useConfig();
  const notif = useNotifications();
  const navigate = useNavigate();

  const now = new Date();
  const firstName = getEmployeeName(user, "").split(" ")[0] || "";
  const myEmployeeId = user?.id || null;

  // Capability flags (stable primitives — used as fetch gates).
  const isHR = isAdmin || can(RESOURCE_CODES.EMPLOYEES, "read");
  const canPayroll = can(RESOURCE_CODES.PAYROLL, "read");
  const canLoansAll = can(RESOURCE_CODES.LOANS, "read");
  const canAudit = isAdmin || can(RESOURCE_CODES.AUDIT_LOGS, "read");
  const canApprovals = can([RESOURCE_CODES.LEAVE_REQUESTS, RESOURCE_CODES.DOCUMENTS, RESOURCE_CODES.PROFILE_UPDATE], "read");

  // Shared lookups (all employee-readable) — fetched ONCE, reused everywhere.
  const [shared, setShared] = useState({ loading: true, profile: null, directory: [], departments: [], jobRoles: [] });
  useEffect(() => {
    let stale = false;
    (async () => {
      const [profile, directory, departments, jobRoles] = await Promise.all([
        api.get("/api/users/profile").catch(() => null),
        orgService.listDirectory().catch(() => []),
        setupService.getDepartments().then((r) => (Array.isArray(r) ? r : r?.departments || [])).catch(() => []),
        setupService.getJobRoles().then((r) => (Array.isArray(r) ? r : r?.jobRoles || r?.job_roles || [])).catch(() => []),
      ]);
      if (!stale) setShared({ loading: false, profile, directory: directory || [], departments: departments || [], jobRoles: jobRoles || [] });
    })();
    return () => { stale = true; };
  }, []);

  // Each domain fetched once, capability-gated (no duplicate calls across widgets).
  const leave = useDomain(() => leaveService.list().then((r) => (Array.isArray(r) ? r : [])), true, []);
  const leaveTypes = useDomain(() => setupService.getEligibleLeaveTypes().then((r) => (Array.isArray(r) ? r : r?.data || [])), true, []);
  const payslips = useDomain(() => payrollService.listMyPayslips().then((r) => (Array.isArray(r) ? r : [])), true, []);
  const loans = useDomain(() => loanService.listMine().then((r) => (Array.isArray(r) ? r : [])), true, []);
  const reviews = useDomain(() => appraisalReviewService.list().then((r) => (Array.isArray(r) ? r : [])), true, []);
  const cycle = useDomain(() => appraisalCycleService.current(), true, []);
  const orgStats = useDomain(() => orgService.getOrgStats().then((r) => r?.data || r), isHR, [isHR]);

  const report = useDomain(() => appraisalReviewService.report().then((r) => r?.data || r), isAdmin, [isAdmin]);
  const approvals = useDomain(async () => {
    const [lv, dc, pf] = await Promise.all([
      can(RESOURCE_CODES.LEAVE_REQUESTS, "read") ? approvalService.getPendingLeave().catch(() => []) : [],
      can(RESOURCE_CODES.DOCUMENTS, "read") ? approvalService.getPendingDocuments().catch(() => []) : [],
      can(RESOURCE_CODES.PROFILE_UPDATE, "read") ? approvalService.getPendingProfileUpdates().catch(() => []) : [],
    ]);
    return { leave: lv.length, docs: dc.length, profile: pf.length };
  }, canApprovals, [canApprovals]);
  const payroll = useDomain(async () => {
    const [runs, adjustments] = await Promise.all([
      payrollService.listRuns().catch(() => []), payrollService.listAdjustments().catch(() => []),
    ]);
    return { runs: Array.isArray(runs) ? runs : [], adjustments: Array.isArray(adjustments) ? adjustments : [] };
  }, canPayroll, [canPayroll]);
  const portfolio = useDomain(() => loanService.listAll().then((r) => (Array.isArray(r) ? r : [])), canLoansAll, [canLoansAll]);

  const configGaps = useDomain(async () => {
    const arr = (r) => (Array.isArray(r) ? r : r?.data || []);
    const [types, workflows, payGroups] = await Promise.all([
      setupService.getLeaveTypes().then(arr).catch(() => null),
      setupService.getWorkflows().then(arr).catch(() => null),
      setupService.getPayGroups().then(arr).catch(() => null),
    ]);
    const gaps = [];
    if (types && types.length === 0) gaps.push({ label: "No leave types configured", sev: "warn", to: "/app/directory" });
    if (workflows && workflows.length === 0) gaps.push({ label: "No approval workflow configured", sev: "warn", to: "/app/workflows" });
    if (payGroups && payGroups.length === 0) gaps.push({ label: "No pay group configured", sev: "warn", to: "/app/directory" });
    return gaps;
  }, isHR, [isHR]);

  const deptName = useCallback((id) => shared.departments.find((d) => d.id === id)?.name || "—", [shared.departments]);
  const roleName = useCallback((id) => { const r = shared.jobRoles.find((x) => x.id === id); return r?.title || r?.name || "—"; }, [shared.jobRoles]);
  const personName = useCallback((id) => { const p = shared.directory.find((u) => u.id === id); return p ? getEmployeeName(p, p.email || "—") : "—"; }, [shared.directory]);

  const myReports = useMemo(() => shared.directory.filter((u) => u.manager_id && u.manager_id === myEmployeeId), [shared.directory, myEmployeeId]);
  const isDeptHead = useMemo(() => shared.departments.some((d) => d.head_employee_id && d.head_employee_id === myEmployeeId), [shared.departments, myEmployeeId]);
  const isManager = myReports.length > 0 || isDeptHead;

  const roleLabel = isAdmin ? "Administrator" : isHR ? "HR" : canPayroll ? "Payroll" : isManager ? "Manager" : "Employee";
  const showOrg = isHR || canPayroll || canApprovals || canLoansAll || canAudit;

  // Lightweight refresh — reloads every active domain + notifications and stamps
  // the "last updated" time. Not a full-page reload.
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const refreshAll = () => {
    [leave, leaveTypes, payslips, loans, reviews, cycle, orgStats, report, approvals, payroll, portfolio, configGaps]
      .forEach((d) => d.reload());
    notif.refresh();
    setRefreshedAt(Date.now());
  };

  // Hero insights — compact, actionable, shown only when there is a real signal.
  const pendingApprovals = (approvals.data?.leave || 0) + (approvals.data?.docs || 0) + (approvals.data?.profile || 0);
  const payrollReady = (payroll.data?.runs || []).some((r) => { const s = String(r.status || ""); return s.includes("pending_approval") || s === "locked_in"; });
  const insights = [];
  if (canApprovals && pendingApprovals > 0) insights.push({ key: "appr", value: pendingApprovals, label: `pending approval${pendingApprovals > 1 ? "s" : ""}`, to: "/app/approvals" });
  if (canPayroll && payrollReady) insights.push({ key: "pay", text: "Payroll ready", to: "/app/payroll" });
  if (notif.unreadCount > 0) insights.push({ key: "notif", value: notif.unreadCount, label: `unread notification${notif.unreadCount > 1 ? "s" : ""}`, to: "/app" });

  const dateLine = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (!ready) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-sunken" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-sunken" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Greeting hero */}
      <Reveal className="relative overflow-hidden rounded-3xl border border-line/80 bg-gradient-to-br from-brand-darkest via-brand-dark to-brand p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 sm:text-[11px] sm:tracking-[0.3em]">{config?.organization_name || "Your workspace"} · {dateLine}</div>
          <div className="flex items-center gap-2">
            <button onClick={refreshAll} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Refresh dashboard">
              <RotateCw className="h-3 w-3" aria-hidden="true" /> Updated {fmtWhen(refreshedAt)}
            </button>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">{roleLabel}</span>
          </div>
        </div>
        <h1 className="relative mt-3 font-serif text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          {greetingFor(now.getHours())}{firstName ? "," : ""}{firstName && <span className="italic text-accent"> {firstName}.</span>}
        </h1>
        <p className="relative mt-3 max-w-md text-sm leading-relaxed text-white/60">Here's what needs your attention today.</p>
        {insights.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {insights.map((i) => (
              <button key={i.key} onClick={() => navigate(i.to)} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                {i.value != null ? <span className="tabular-nums"><Count value={i.value} /> {i.label}</span> : i.text}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </Reveal>

      <Reveal delay={0.04}><QuickActions can={can} isAdmin={isAdmin} /></Reveal>

      {/* Action lane — tasks + notifications for everyone */}
      <Reveal delay={0.08} aria-label="Action items" className="grid gap-4 lg:grid-cols-2">
        <MyTasks profile={shared.profile} reviews={reviews} approvals={approvals} payroll={payroll} orgStats={orgStats}
          myEmployeeId={myEmployeeId} roleFlags={{ isManager, canApprovals, canPayroll, isHR }} />
        <Notifications />
      </Reveal>

      {/* Employee self */}
      <section aria-label="My workspace" className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">My workspace</h2>
        <EmploymentSummary profile={shared.profile} loading={shared.loading} deptName={deptName} roleName={roleName} personName={personName} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MyLeave leave={leave} types={leaveTypes} />
          <MyPayroll payslips={payslips} />
          <MyLoans loans={loans} />
          <MyAppraisal reviews={reviews} cycle={cycle} myEmployeeId={myEmployeeId} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <UpcomingEvents leave={leave} orgStats={orgStats} isHR={isHR} />
          {isManager && <ManagerTeam myReports={myReports} personName={personName} reviews={reviews} myEmployeeId={myEmployeeId} />}
        </div>
      </section>

      {/* Organization */}
      {showOrg && (
        <section aria-label="Organization" className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Organization</h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {isHR && <OrgHealth orgStats={orgStats} configGaps={configGaps} cycle={cycle} payroll={payroll} canPayroll={canPayroll} />}
            {isHR && <OrgStats orgStats={orgStats} />}
            {canApprovals && <PendingApprovals approvals={approvals} />}
            {isAdmin && <AppraisalOverview report={report} />}
            {canPayroll && <PayrollOverview payroll={payroll} />}
            {canLoansAll && <LoanPortfolio portfolio={portfolio} />}
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardPage;
