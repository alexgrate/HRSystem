import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Building2, Users, HandCoins, TrendingUp } from "lucide-react";
import { platformAnalyticsService } from "../../services/platformAnalyticsService";

const fmtNumber = (n) => Number(n || 0).toLocaleString();
const fmtMoney = (n) => `₦${Number(n || 0).toLocaleString()}`;

const STATUS_LABEL = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
  disbursed: "Disbursed",
  rejected: "Rejected",
  active: "Active",
  repaid: "Repaid",
  defaulted: "Defaulted",
  cancelled: "Cancelled",
};

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export default function PlatformDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stale = false;
    platformAnalyticsService
      .getOverview()
      .then((res) => { if (!stale) { setData(res); setFailed(false); } })
      .catch((err) => { console.error("[Platform] Failed to load analytics:", err); if (!stale) setFailed(true); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-ink-muted">Loading platform analytics…</div>;
  }
  if (failed || !data) {
    return (
      <div className="p-8 text-center text-ink-faint border border-dashed border-line rounded-2xl bg-card">
        Analytics couldn't be loaded right now. Please try again shortly.
      </div>
    );
  }

  const totalLoans = (data.loans_by_status || []).reduce((s, r) => s + r.count, 0);
  const totalLoanVolume = (data.loans_by_status || []).reduce((s, r) => s + r.principal, 0);

  const growthChartData = (data.organization_growth || []).map((r) => ({ month: r.month, Organizations: r.count }));
  const sourceChartData = (data.loans_by_source || []).map((r) => ({
    source: r.loan_source === "dash" ? "Dash" : "Internal",
    Count: r.count,
    Volume: r.principal,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Platform overview</h1>
        <p className="text-sm text-ink-muted">Cross-organization analytics, updated live.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Organizations"
          value={fmtNumber(data.organizations.total)}
          hint={`${fmtNumber(data.organizations.active)} active · ${fmtNumber(data.organizations.inactive)} inactive`}
        />
        <StatCard icon={Users} label="Employees" value={fmtNumber(data.total_employees)} hint="Across every organization" />
        <StatCard icon={HandCoins} label="Loans" value={fmtNumber(totalLoans)} hint={fmtMoney(totalLoanVolume) + " total principal"} />
        <StatCard
          icon={TrendingUp}
          label="Dash-sourced loans"
          value={fmtNumber((data.loans_by_source || []).find((r) => r.loan_source === "dash")?.count || 0)}
          hint="vs. internal org-funded loans"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Organization growth</h3>
          <p className="text-xs text-ink-muted">New organizations onboarded per month.</p>
          <div className="mt-4 h-64">
            {growthChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChartData}>
                  <defs>
                    <linearGradient id="orgGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary, #6366f1)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--brand-primary, #6366f1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Organizations" stroke="var(--brand-primary, #6366f1)" fill="url(#orgGrowth)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-faint">No data yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Loans — internal vs. Dash</h3>
          <p className="text-xs text-ink-muted">Count of loan requests by lending source.</p>
          <div className="mt-4 h-64">
            {sourceChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Count" fill="var(--brand-primary, #6366f1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-faint">No loans yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Top organizations by headcount</h3>
          <ul className="mt-3 divide-y divide-line-soft">
            {(data.top_organizations_by_headcount || []).length ? (
              data.top_organizations_by_headcount.map((org) => (
                <li key={org.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate text-ink-2">{org.name}</span>
                  <span className="font-semibold text-ink">{fmtNumber(org.employee_count)}</span>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-xs text-ink-faint">No organizations yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Loans by status</h3>
          <ul className="mt-3 divide-y divide-line-soft">
            {(data.loans_by_status || []).length ? (
              data.loans_by_status.map((row) => (
                <li key={row.status} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-2">{STATUS_LABEL[row.status] || row.status}</span>
                  <span className="text-right">
                    <span className="font-semibold text-ink">{fmtNumber(row.count)}</span>
                    <span className="ml-2 text-xs text-ink-faint">{fmtMoney(row.principal)}</span>
                  </span>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-xs text-ink-faint">No loans yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
