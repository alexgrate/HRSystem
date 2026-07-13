import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Layers, Inbox, Wallet, UserPlus, CalendarDays, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionContext";
import { useConfig } from "../context/ConfigContext";
import { setupService } from "../services/setupService";
import { approvalService } from "../services/approvalService";
import { payrollService } from "../services/payrollService";
import { getEmployeeName } from "../utils/employee";
import { RESOURCE_CODES } from "../config/resourceCodes";
import api from "../services/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const greetingFor = (hour) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const RUN_LABELS = {
  draft: "Draft",
  preview_generated: "Preview ready",
  submitted_pending_approval: "Awaiting approval",
  approved: "Approved",
  lock_in_pending_approval: "Lock-in pending",
  locked_in: "Locked in",
  distribution_pending_approval: "Distribution pending",
  distributed: "Distributed",
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { can, ready } = usePermissions();
  const { config } = useConfig();
  const navigate = useNavigate();

  const [stats, setStats] = useState({});
  const [loaded, setLoaded] = useState(false);

  const firstName = getEmployeeName(user, "").split(" ")[0] || "";
  const now = new Date();

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    (async () => {
      const jobs = [];

      if (can(RESOURCE_CODES.EMPLOYEES, "read")) {
        jobs.push(
          api.get("/api/users/?page=1&limit=1")
            .then((r) => ["employees", r?.pagination?.total ?? (Array.isArray(r) ? r.length : null)])
            .catch(() => null)
        );
      }
      if (can(RESOURCE_CODES.DEPARTMENTS, "read")) {
        jobs.push(
          setupService.getDepartments()
            .then((d) => ["departments", (d || []).length])
            .catch(() => null)
        );
      }

      const approvalJobs = [];
      if (can(RESOURCE_CODES.LEAVE_REQUESTS, "read")) approvalJobs.push(approvalService.getPendingLeave().catch(() => []));
      if (can(RESOURCE_CODES.DOCUMENTS, "read")) approvalJobs.push(approvalService.getPendingDocuments().catch(() => []));
      if (can(RESOURCE_CODES.PROFILE_UPDATE, "read")) approvalJobs.push(approvalService.getPendingProfileUpdates().catch(() => []));
      if (approvalJobs.length) {
        jobs.push(
          Promise.all(approvalJobs)
            .then((lists) => ["pendingApprovals", lists.flat().length])
            .catch(() => null)
        );
      }

      if (can(RESOURCE_CODES.PAYROLL, "read")) {
        jobs.push(
          payrollService.listRuns()
            .then((runs) => ["latestRun", runs[0] || null])
            .catch(() => null)
        );
      }

      const results = (await Promise.all(jobs)).filter(Boolean);
      if (!stale) {
        setStats(Object.fromEntries(results));
        setLoaded(true);
      }
    })();
    return () => { stale = true; };
  }, [ready, can]);

  const tiles = useMemo(() => {
    const t = [];
    if (stats.employees != null) t.push({ label: "Employees", value: stats.employees, Icon: Users, to: "/app/directory" });
    if (stats.departments != null) t.push({ label: "Departments", value: stats.departments, Icon: Layers, to: "/app/directory" });
    if (stats.pendingApprovals != null) t.push({ label: "Pending approvals", value: stats.pendingApprovals, Icon: Inbox, to: "/app/approvals", attention: stats.pendingApprovals > 0 });
    if (stats.latestRun !== undefined) {
      const run = stats.latestRun;
      t.push({
        label: "Latest payroll",
        value: run ? `${MONTHS[(run.month || 1) - 1]?.slice(0, 3)} ${run.year}` : "None yet",
        sub: run ? RUN_LABELS[run.status] || run.status : "Run your first payroll",
        Icon: Wallet,
        to: "/app/payroll",
      });
    }
    return t;
  }, [stats]);

  const quickActions = [
    { label: "Onboard employee", Icon: UserPlus, to: "/app/directory", show: can(RESOURCE_CODES.EMPLOYEES, "create") },
    { label: "Run payroll", Icon: Wallet, to: "/app/payroll", show: can(RESOURCE_CODES.PAYROLL, "create") },
    { label: "Review approvals", Icon: Inbox, to: "/app/approvals", show: can([RESOURCE_CODES.LEAVE_REQUESTS, RESOURCE_CODES.DOCUMENTS, RESOURCE_CODES.PROFILE_UPDATE], "manage") },
    { label: "Manage access", Icon: ShieldCheck, to: "/app/settings", show: can(RESOURCE_CODES.ROLE_PERMISSIONS, "read") },
    { label: "Request leave", Icon: CalendarDays, to: "/app/self-service", show: true },
  ].filter((a) => a.show);

  const dateLine = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      {/* Greeting hero */}
      <div className="relative overflow-hidden rounded-3xl border border-line/80 bg-gradient-to-br from-brand-darkest via-brand-dark to-brand p-8 sm:p-10 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />

        <div className="anim anim-fade relative text-[11px] uppercase tracking-[0.3em] text-white/50" style={{ animationDelay: "0.05s" }}>
          {config?.organization_name || "Your workspace"} · {dateLine}
        </div>
        <h1 className="relative mt-3 font-serif text-4xl sm:text-5xl font-bold leading-[1.02] tracking-tight">
          <span className="anim anim-reveal block" style={{ animationDelay: "0.15s" }}>
            {greetingFor(now.getHours())}{firstName ? "," : ""}
          </span>
          {firstName && (
            <span className="anim anim-reveal block italic text-accent" style={{ animationDelay: "0.3s" }}>
              {firstName}.
            </span>
          )}
        </h1>
        <p className="anim anim-fade relative mt-4 max-w-md text-sm leading-relaxed text-white/60" style={{ animationDelay: "0.55s" }}>
          Here’s where your organization stands today.
        </p>
      </div>

      {/* Stat tiles */}
      {loaded && tiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t, i) => {
            const Icon = t.Icon;
            return (
              <button
                key={t.label}
                onClick={() => navigate(t.to)}
                className="anim anim-fade group rounded-2xl border border-line/80 bg-card p-5 text-left shadow-sm transition-all hover:border-brand/30 hover:shadow-md"
                style={{ animationDelay: `${0.35 + i * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.attention ? "bg-amber-50 text-amber-600" : "bg-brand/10 text-brand"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-ghost transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight text-ink">{t.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{t.label}</div>
                {t.sub && <div className="mt-0.5 text-xs text-ink-muted">{t.sub}</div>}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="anim anim-fade" style={{ animationDelay: "0.7s" }}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">Quick actions</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => {
              const Icon = a.Icon;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink-2 shadow-sm transition-all hover:border-brand/40 hover:text-brand"
                >
                  <Icon className="h-4 w-4" /> {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
