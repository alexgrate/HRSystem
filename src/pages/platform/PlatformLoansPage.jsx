import { useEffect, useState } from "react";
import { X, Search, HandCoins, ChevronLeft, ChevronRight } from "lucide-react";
import { platformLoanService } from "../../services/platformLoanService";
import { platformOrganizationService } from "../../services/platformOrganizationService";
import { platformAnalyticsService } from "../../services/platformAnalyticsService";
import { useToast } from "../../components/ui/Notifications";
import LoanAgreementView from "../../components/loans/LoanAgreementView";

const fmtDate = (v) => (v ? String(v).slice(0, 10) : "—");
const fmtMoney = (n) => `₦${Number(n || 0).toLocaleString()}`;
const employeeName = (row) => `${row.firstname || ""} ${row.lastname || ""}`.trim() || row.employee_email || "Employee";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "disbursed", label: "Disbursed" },
  { value: "rejected", label: "Rejected" },
  { value: "active", label: "Active" },
  { value: "repaid", label: "Repaid" },
  { value: "defaulted", label: "Defaulted" },
  { value: "cancelled", label: "Cancelled" },
];

const SOURCE_TABS = [
  { value: "dash", label: "Against Dash" },
  { value: "internal", label: "Internal" },
  { value: "", label: "All" },
];

const StatusBadge = ({ status }) => {
  const tone =
    status === "approved" || status === "disbursed" || status === "active" || status === "repaid"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected" || status === "defaulted" || status === "cancelled"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{String(status || "").replace(/_/g, " ")}</span>;
};

const SourceBadge = ({ source }) => (
  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${source === "dash" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
    {source === "dash" ? "Dash" : "Internal"}
  </span>
);

function LoanDetailDrawer({ loanId, onClose }) {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    platformLoanService
      .get(loanId)
      .then((loan) => { if (!stale) setDetail(loan); })
      .catch((err) => toast.error(err?.error?.message || err?.message || "Couldn't load loan."))
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [loanId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
      <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-lg flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft p-4">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">{detail ? employeeName(detail) : "Loan"}</h3>
            {detail && <p className="text-xs text-ink-faint">{detail.organization_name}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>

        {loading ? (
          <div className="flex-1 p-6 text-center text-sm text-ink-muted">Loading…</div>
        ) : !detail ? (
          <div className="flex-1 p-6 text-center text-sm text-ink-faint">Loan not found.</div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <SourceBadge source={detail.loan_source} />
              <span className="text-xs text-ink-faint">Created {fmtDate(detail.created_at)}</span>
            </div>

            {detail.loan_source === "dash" ? (
              <LoanAgreementView
                mode="view"
                termsText={detail.agreement_terms_snapshot}
                figures={{
                  loanTypeName: detail.loan_type_name,
                  amount: detail.amount,
                  interestRate: detail.interest_rate,
                  tenureMonths: detail.tenure_month,
                  monthlyInstallment: detail.monthly_installment,
                  totalRepayable: detail.total_repayable,
                  startDate: fmtDate(detail.start_date),
                  endDate: fmtDate(detail.end_date),
                }}
                signatureDataUrl={detail.agreement_signature_data}
              />
            ) : (
              <div className="rounded-xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{detail.loan_type_name || "Loan"}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-2">
                  <div className="flex justify-between"><span className="text-ink-faint">Amount</span><span className="font-semibold">{fmtMoney(detail.amount)}</span></div>
                  <div className="flex justify-between"><span className="text-ink-faint">Rate</span><span className="font-semibold">{detail.interest_rate}%/yr</span></div>
                  <div className="flex justify-between"><span className="text-ink-faint">Tenure</span><span className="font-semibold">{detail.tenure_month} month{detail.tenure_month === 1 ? "" : "s"}</span></div>
                  <div className="flex justify-between"><span className="text-ink-faint">Monthly installment</span><span className="font-semibold">{fmtMoney(detail.monthly_installment)}</span></div>
                  <div className="flex justify-between"><span className="text-ink-faint">Total repayable</span><span className="font-semibold">{fmtMoney(detail.total_repayable)}</span></div>
                </div>
                <p className="mt-2 text-xs text-ink-faint">Repayments run from {fmtDate(detail.start_date)} to {fmtDate(detail.end_date)}.</p>
              </div>
            )}

            <div className="border-t border-line-soft pt-3 text-xs text-ink-muted">
              <p><span className="text-ink-faint">Reason:</span> {detail.reason || "—"}</p>
              {detail.approved_at && <p className="mt-1"><span className="text-ink-faint">Approved:</span> {fmtDate(detail.approved_at)}</p>}
              {detail.disbursed_at && <p className="mt-1"><span className="text-ink-faint">Disbursed:</span> {fmtDate(detail.disbursed_at)}</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function PlatformLoansPage() {
  const toast = useToast();
  const [loans, setLoans] = useState([]);
  const [total, setTotal] = useState(0);
  const [organizations, setOrganizations] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [source, setSource] = useState("dash");
  const [status, setStatus] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 25;

  useEffect(() => {
    platformOrganizationService.list().then((rows) => setOrganizations(Array.isArray(rows) ? rows : [])).catch(() => {});
    platformAnalyticsService.getOverview().then(setOverview).catch(() => {});
  }, []);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    platformLoanService
      .list({
        source: source || undefined,
        status: status || undefined,
        organization_id: organizationId || undefined,
        search: search.trim() || undefined,
        limit,
        offset: page * limit,
      })
      .then((res) => {
        if (stale) return;
        setLoans(Array.isArray(res?.loans) ? res.loans : []);
        setTotal(res?.total || 0);
      })
      .catch((err) => toast.error(err?.error?.message || err?.message || "Couldn't load loans."))
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, status, organizationId, search, page]);

  useEffect(() => { setPage(0); }, [source, status, organizationId, search]);

  const bySource = overview?.loans_by_source || [];
  const dashSummary = bySource.find((r) => r.loan_source === "dash");
  const internalSummary = bySource.find((r) => r.loan_source === "internal");
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Loans</h1>
        <p className="text-sm text-ink-muted">Every loan created across the platform, including loans created and approved against Dash.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-ink">{dashSummary?.count ?? 0}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Against Dash</div>
        </div>
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-ink">{fmtMoney(dashSummary?.principal)}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Dash principal</div>
        </div>
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-ink">{internalSummary?.count ?? 0}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Internal loans</div>
        </div>
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-ink">{fmtMoney(internalSummary?.principal)}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Internal principal</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-line bg-card p-0.5">
          {SOURCE_TABS.map((t) => (
            <button
              key={t.value || "all"}
              onClick={() => setSource(t.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${source === t.value ? "bg-brand text-white" : "text-ink-muted hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-xl border border-line bg-card px-2 text-xs outline-none focus:border-brand">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="h-9 rounded-xl border border-line bg-card px-2 text-xs outline-none focus:border-brand">
          <option value="">All organizations</option>
          {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or organization…"
            className="h-9 w-full rounded-xl border border-line bg-card pl-8 pr-3 text-xs outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line/80 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-line-soft bg-sunken/40 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Loan type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-muted">Loading loans…</td></tr>
            ) : loans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-faint">
                  <HandCoins className="mx-auto h-8 w-8 text-ink-ghost" />
                  <p className="mt-2">No loans match your filters.</p>
                </td>
              </tr>
            ) : (
              loans.map((loan) => (
                <tr key={loan.id} onClick={() => setSelectedId(loan.id)} className="cursor-pointer hover:bg-sunken/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{employeeName(loan)}</div>
                    <div className="text-xs text-ink-faint">{loan.employee_email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{loan.organization_name}</td>
                  <td className="px-4 py-3 text-ink-2">{loan.loan_type_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink-2">{fmtMoney(loan.amount)}</td>
                  <td className="px-4 py-3"><SourceBadge source={loan.loan_source} /></td>
                  <td className="px-4 py-3"><StatusBadge status={loan.status} /></td>
                  <td className="px-4 py-3 text-ink-faint">{fmtDate(loan.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>{total} loan{total === 1 ? "" : "s"} total</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-lg border border-line p-1.5 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-line p-1.5 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {selectedId && <LoanDetailDrawer loanId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
