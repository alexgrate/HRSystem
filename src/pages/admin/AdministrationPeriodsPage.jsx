import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarDays, CalendarCheck2, Plus, AlertCircle, X } from "lucide-react";
import { TabPills } from "../../components/ui/TabPills";
import { administrationPeriodService, periodDate } from "../../services/administrationPeriodService";
import { usePermissions } from "../../context/PermissionContext";
import { useToast } from "../../components/ui/Notifications";

// Administration periods are the organization's operating windows: leave
// requests must fall inside one, leave-type day budgets reset per period, and
// each appraisal cycle wraps exactly one period. Statuses advance by date
// automatically (scheduled → active → completed) — there is no close/edit.

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
];

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

const inclusiveDays = (start, end) => {
  const s = new Date(periodDate(start));
  const e = new Date(periodDate(end));
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.round((e - s) / 86400000) + 1;
};

const statusChipCls = (status) =>
  status === "active"
    ? "bg-emerald-50 text-emerald-700"
    : status === "scheduled"
      ? "bg-sky-50 text-sky-700"
      : "bg-sunken text-ink-muted";

const AdministrationPeriodsPage = () => {
  const { isAdmin, ready } = usePermissions();
  const [periods, setPeriods] = useState(null); // null = loading / unknown
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [modal, setModal] = useState(null); // { mode: 'open' | 'schedule' }

  const load = async () => {
    try {
      const rows = await administrationPeriodService.list();
      setPeriods(Array.isArray(rows) ? rows : []);
      setError("");
    } catch (err) {
      console.error("[AdminPeriods] Load failed:", err);
      setError(err?.error?.message || err?.message || "Couldn't load administration periods.");
      setPeriods([]);
    }
  };

  useEffect(() => {
    if (!ready || !isAdmin) return;
    let stale = false;
    (async () => {
      try {
        const rows = await administrationPeriodService.list();
        if (!stale) {
          setPeriods(Array.isArray(rows) ? rows : []);
          setError("");
        }
      } catch (err) {
        console.error("[AdminPeriods] Load failed:", err);
        if (!stale) {
          setError(err?.error?.message || err?.message || "Couldn't load administration periods.");
          setPeriods([]);
        }
      }
    })();
    return () => { stale = true; };
  }, [ready, isAdmin]);

  const list = useMemo(() => (Array.isArray(periods) ? periods : []), [periods]);
  const activePeriod = list.find((p) => String(p.status).toLowerCase() === "active") || null;
  const nextScheduled = useMemo(() => {
    const scheduled = list
      .filter((p) => String(p.status).toLowerCase() === "scheduled")
      .sort((a, b) => periodDate(a.start_date).localeCompare(periodDate(b.start_date)));
    return scheduled[0] || null;
  }, [list]);
  const completedCount = list.filter((p) => String(p.status).toLowerCase() === "completed").length;

  const visible = useMemo(
    () => (tab === "all" ? list : list.filter((p) => String(p.status).toLowerCase() === tab)),
    [list, tab]
  );

  if (ready && !isAdmin) {
    return (
      <div className="p-8 text-center text-ink-muted border border-dashed border-line rounded-2xl bg-card">
        Administration periods are managed by organization administrators.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Organization Calendar</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Administration Periods</h1>
          <p className="mt-1 text-sm text-ink-muted">
            The operating windows that govern leave requests, day budgets, and appraisal cycles across the organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ mode: "schedule" })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-sunken"
          >
            <CalendarClock className="h-3.5 w-3.5" /> Schedule period
          </button>
          <button
            onClick={() => setModal({ mode: "open" })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5" /> Open period now
          </button>
        </div>
      </div>

      {Array.isArray(periods) && !activePeriod && !error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <span className="font-semibold">No administration period is open.</span> Employees can't submit
            leave requests and appraisal targets can't be set until a period covers today. Open one now or
            schedule the next window.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
          <span className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> {error}
          </span>
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <CalendarCheck2 className="h-3.5 w-3.5" /> Current period
          </div>
          {activePeriod ? (
            <>
              <div className="mt-1.5 text-lg font-bold tracking-tight text-ink">{activePeriod.name || "Unnamed period"}</div>
              <div className="text-xs text-ink-muted">
                {periodDate(activePeriod.start_date)} → {periodDate(activePeriod.end_date)}
              </div>
            </>
          ) : (
            <div className="mt-1.5 text-lg font-bold tracking-tight text-amber-600">None open</div>
          )}
        </div>
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <CalendarClock className="h-3.5 w-3.5" /> Next scheduled
          </div>
          {nextScheduled ? (
            <>
              <div className="mt-1.5 text-lg font-bold tracking-tight text-ink">{nextScheduled.name || "Unnamed period"}</div>
              <div className="text-xs text-ink-muted">
                {periodDate(nextScheduled.start_date)} → {periodDate(nextScheduled.end_date)}
              </div>
            </>
          ) : (
            <div className="mt-1.5 text-lg font-bold tracking-tight text-ink-faint">—</div>
          )}
        </div>
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <CalendarDays className="h-3.5 w-3.5" /> Completed periods
          </div>
          <div className="mt-1.5 text-lg font-bold tracking-tight text-ink">{completedCount}</div>
          <div className="text-xs text-ink-muted">{list.length} total on record</div>
        </div>
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-4">
          <TabPills layoutId="admin-period-tab" active={tab} onChange={setTab} tabs={STATUS_TABS} />
          <p className="text-[11px] text-ink-faint">
            Periods can't overlap; each completes automatically when its end date passes.
          </p>
        </div>

        {!Array.isArray(periods) ? (
          <div className="p-12 text-center text-sm text-ink-muted">Loading periods…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarClock className="mx-auto h-12 w-12 text-ink-ghost" />
            <h3 className="mt-4 text-sm font-semibold text-ink">
              {tab === "all" ? "No administration periods yet" : `No ${tab} periods`}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
              {tab === "all"
                ? "Open a period to unblock leave requests and let the appraisal for the window begin."
                : "Nothing in this state right now."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Window</th>
                  <th className="px-4 py-3 text-left font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const days = inclusiveDays(p.start_date, p.end_date);
                  return (
                    <tr key={p.id} className="border-t border-line-soft">
                      <td className="px-5 py-3 font-semibold text-ink">{p.name || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                        {periodDate(p.start_date)} → {periodDate(p.end_date)}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{days != null ? `${days} day${days === 1 ? "" : "s"}` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusChipCls(String(p.status).toLowerCase())}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">{fmtDate(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <PeriodModal
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load();
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
      console.error("[AdminPeriods] Period save failed:", err);
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
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. H2 2026 administration period" />
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

export default AdministrationPeriodsPage;
