import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket, CheckCircle2, ArrowRight, Building, Layers, Briefcase,
  Wallet, GitBranch, Users, ShieldCheck, Sparkles,
} from "lucide-react";
import { setupService } from "../../services/setupService";
import { rolePermissionService } from "../../services/rolePermissionService";
import { useCan } from "../../context/PermissionContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import api from "../../services/api";
import bootstrapConfig from "../../assets/bootstrap-config.json";

const len = (x) => (Array.isArray(x) ? x.length : 0);

const OnboardingPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const canBootstrap = useCan(RESOURCE_CODES.SETUP, "create");

  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [offices, depts, jobs, payGrades, benefits, workflows, users, sysRoles] = await Promise.all([
        setupService.getOffices().catch(() => []),
        setupService.getDepartments().catch(() => []),
        setupService.getJobRoles().catch(() => []),
        setupService.getPayGrades().catch(() => []),
        setupService.getBenefitLevels().catch(() => []),
        setupService.getWorkflows().catch(() => []),
        api.get("/api/users/?limit=1").catch(() => ({ pagination: { total: 0 } })),
        rolePermissionService.getSystemRoles().catch(() => []),
      ]);
      const employees = users?.pagination?.total ?? (Array.isArray(users) ? users.length : len(users?.users));
      setCounts({
        offices: len(offices),
        departments: len(depts),
        jobTitles: len(jobs),
        payGrades: len(payGrades),
        benefitLevels: len(benefits),
        workflows: len(workflows),
        employees,
        systemRoles: len(sysRoles),
      });
    } catch (err) {
      console.error("[Onboarding] Failed to load setup status:", err);
      setCounts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runBootstrap = async () => {
    const ok = await confirm({
      title: "Load a starter template?",
      message: "This creates sample departments, job titles, pay grades, leave types and more in this organization.",
      confirmLabel: "Load template",
    });
    if (!ok) return;
    setBootstrapping(true);
    try {
      await setupService.bootstrapOrganization(bootstrapConfig);
      toast.success("Starter template loaded. Review and adjust the values as needed.");
      await load();
    } catch (err) {
      console.error("[Onboarding] Bootstrap failed:", err);
      toast.error(err?.message || "Couldn’t load the starter template.");
    } finally {
      setBootstrapping(false);
    }
  };

  const steps = counts
    ? [
        { key: "offices", label: "Office Locations", desc: "Where your people are based", Icon: Building, count: counts.offices, to: "/app/directory" },
        { key: "departments", label: "Departments", desc: "Your organizational units", Icon: Layers, count: counts.departments, to: "/app/directory" },
        { key: "jobTitles", label: "Job Titles", desc: "Roles people are hired into", Icon: Briefcase, count: counts.jobTitles, to: "/app/directory" },
        { key: "payGrades", label: "Pay Grades & Benefits", desc: "Salary bands and benefit levels", Icon: Wallet, count: counts.payGrades + counts.benefitLevels, to: "/app/directory" },
        { key: "workflows", label: "Approval Workflows", desc: "Multi-stage approval chains", Icon: GitBranch, count: counts.workflows, to: "/app/workflows" },
        { key: "employees", label: "Employees", desc: "Onboard your team", Icon: Users, count: counts.employees, to: "/app/directory" },
      ]
    : [];

  const done = steps.filter((s) => s.count > 0).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const isEmpty = counts && counts.departments === 0 && counts.jobTitles === 0 && counts.employees === 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Getting Started</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Set up your workspace</h1>
        <p className="mt-1 text-sm text-ink-muted">Configure your organization’s foundations, then onboard your people.</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-ink-muted bg-card rounded-2xl border border-line-soft">Checking your setup…</div>
      ) : (
        <>
          {/* Progress */}
          <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-brand/5 to-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-ink">{done} of {steps.length} areas configured</div>
                <div className="text-xs text-ink-muted">Complete these to unlock the full HRIS.</div>
              </div>
              <div className="text-2xl font-bold text-brand">{pct}%</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sunken">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2" />
            </div>
          </div>

          {/* Quick start (only when the org is essentially empty) */}
          {isEmpty && canBootstrap && (
            <div className="rounded-2xl border border-brand/20 bg-card p-6 shadow-sm">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Rocket className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink">Start with a template</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    New here? Load a sample structure (departments, job titles, pay grades, leave types) so you can explore
                    right away, then tweak the values. You can also build everything manually below.
                  </p>
                </div>
                <button
                  onClick={runBootstrap}
                  disabled={bootstrapping}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-70"
                >
                  <Sparkles className="h-4 w-4" /> {bootstrapping ? "Loading…" : "Load starter template"}
                </button>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((s) => {
              const Icon = s.Icon;
              const complete = s.count > 0;
              return (
                <button
                  key={s.key}
                  onClick={() => navigate(s.to)}
                  className="group flex items-center gap-4 rounded-2xl border border-line/80 bg-card p-4 text-left shadow-sm transition-all hover:border-brand/30 hover:shadow-md"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${complete ? "bg-emerald-50 text-emerald-600" : "bg-sunken text-ink-muted"}`}>
                    {complete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{s.label}</span>
                      {complete && <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-bold text-ink-muted">{s.count}</span>}
                    </div>
                    <div className="text-xs text-ink-muted">{s.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-ghost transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </button>
              );
            })}
          </div>

          {/* Access control card */}
          <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-ink">Access control</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Set what each role can do, then map roles to job titles so employees inherit the right permissions.
                  {counts?.systemRoles ? ` ${counts.systemRoles} roles available.` : ""}
                </p>
              </div>
              <button
                onClick={() => navigate("/app/settings")}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-sunken"
              >
                Configure access <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OnboardingPage;
