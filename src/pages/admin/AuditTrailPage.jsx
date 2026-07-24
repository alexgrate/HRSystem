import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { auditService } from "../../services/auditService";
import { ErrorState } from "../../components/ui/ErrorState";

// The audit endpoint returns a lean record: { user_full_name, action, time,
// process }. Names are embedded, so no roster lookup is needed.
const whenOf = (r) => r.time || r.created_at || r.timestamp || r.performed_at || null;
const actorOf = (r) => r.user_full_name || r.actor_name || r.employee_name || "System";
const actionOf = (r) => r.action || r.event || "activity";
const processOf = (r) => r.process || r.module || "";
const isHttp = (r) => String(actionOf(r)).toLowerCase().startsWith("http.");

const prettify = (s) =>
  String(s || "")
    .replace(/[_.-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Every operation is logged twice: a transport row (http.post/put/delete) and
// a domain event (leave_request.created). Map the process to one human module
// so both collapse to the same category.
const MODULE_MAP = [
  { test: /auth|session|login/, label: "Authentication", cls: "bg-amber-50 text-amber-700" },
  { test: /leave/, label: "Leave", cls: "bg-emerald-50 text-emerald-700" },
  { test: /payroll/, label: "Payroll", cls: "bg-violet-50 text-violet-700" },
  { test: /approval/, label: "Approvals", cls: "bg-sky-50 text-sky-700" },
  { test: /document/, label: "Documents", cls: "bg-sky-50 text-sky-700" },
  { test: /system.?config/, label: "Company Settings", cls: "bg-sunken text-ink-muted" },
  { test: /profile/, label: "Profile", cls: "bg-emerald-50 text-emerald-700" },
  { test: /setup/, label: "Setup", cls: "bg-violet-50 text-violet-700" },
  { test: /role|permission/, label: "Access", cls: "bg-red-50 text-red-700" },
  { test: /user|employee/, label: "Users", cls: "bg-emerald-50 text-emerald-700" },
];

const moduleOf = (process) => {
  const p = String(process || "").toLowerCase();
  return MODULE_MAP.find((m) => m.test.test(p)) || { label: prettify(process) || "System", cls: "bg-sunken text-ink-muted" };
};

const HTTP_VERB = { post: "Created", put: "Updated", patch: "Updated", delete: "Deleted", get: "Viewed" };

// Turn "leave_request.created" → "Created", "approval.request.state_changed" →
// "State changed", "http.post" (auth) → "Signed in".
const humanizeAction = (action, process) => {
  const a = String(action || "").toLowerCase();
  if (a.startsWith("http.")) {
    const verb = a.split(".")[1] || "";
    if (/auth|session|login/.test(String(process).toLowerCase()) && verb === "post") return "Signed in";
    return HTTP_VERB[verb] || prettify(verb) || "Request";
  }
  const parts = a.split(".");
  return prettify(parts[parts.length - 1] || a);
};

const actionTone = (label) => {
  const s = label.toLowerCase();
  if (/(delete|reject|remove|fail|declin)/.test(s)) return "text-red-600";
  if (/(create|upload|add|sign|register)/.test(s)) return "text-sky-700";
  if (/(approve|distribut|activat)/.test(s)) return "text-emerald-600";
  if (/(update|edit|assign|submit|change)/.test(s)) return "text-violet-700";
  return "text-ink-2";
};

const fmtWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const PAGE_SIZE = 25;

const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [showHttp, setShowHttp] = useState(false);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const rows = await auditService.list(500);
        if (!stale) { setLogs(Array.isArray(rows) ? rows : []); setError(false); }
      } catch (err) {
        console.error("[Audit] Failed to load audit logs:", err);
        // Don't blank the log to an "empty" state — a failed load must read as a
        // failure, not as "no audit activity" (that would hide an outage).
        if (!stale) setError(true);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => { stale = true; };
  }, [tick]);

  // Collapse the transport half of paired events: an http.* row is hidden when
  // the same user logged a domain event within 2s (the two halves of one
  // operation). http-only actions (sign-ins, uploads, setups) always stay.
  const collapsed = useMemo(() => {
    if (showHttp) return logs;
    const semantic = logs
      .filter((r) => !isHttp(r))
      .map((r) => ({ actor: actorOf(r), t: Date.parse(whenOf(r)) }));
    return logs.filter((r) => {
      if (!isHttp(r)) return true;
      const t = Date.parse(whenOf(r));
      return !semantic.some((s) => s.actor === actorOf(r) && Math.abs(s.t - t) <= 2000);
    });
  }, [logs, showHttp]);

  const modules = useMemo(() => {
    const set = new Set(logs.map((r) => moduleOf(processOf(r)).label));
    return Array.from(set).sort();
  }, [logs]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return collapsed
      .map((r) => {
        const mod = moduleOf(processOf(r));
        const action = humanizeAction(actionOf(r), processOf(r));
        return { r, mod, action, actor: actorOf(r), when: whenOf(r), http: isHttp(r), method: isHttp(r) ? (actionOf(r).split(".")[1] || "").toUpperCase() : null };
      })
      .filter((x) => (moduleFilter === "all" ? true : x.mod.label === moduleFilter))
      .filter((x) => (!s ? true : [x.actor, x.action, x.mod.label].join(" ").toLowerCase().includes(s)));
  }, [collapsed, q, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hiddenCount = logs.length - collapsed.length;

  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Compliance</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Audit Trail</h1>
          <p className="mt-1 text-sm text-ink-muted">Who did what, and when — across every module in your organization.</p>
        </div>
        <button
          onClick={() => { setLoading(true); setPage(1); setTick((t) => t + 1); }}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink-2 shadow-sm hover:border-brand/40 hover:text-brand"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-line-soft p-4">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => resetPage(setQ)(e.target.value)}
              placeholder="Filter by person, action, or module…"
              className="w-full bg-transparent outline-none placeholder:text-ink-faint"
            />
          </div>
          <select
            value={moduleFilter}
            onChange={(e) => resetPage(setModuleFilter)(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink-2 outline-none"
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-muted">
            <input
              type="checkbox"
              checked={showHttp}
              onChange={(e) => resetPage(setShowHttp)(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand"
            />
            Show HTTP request logs{!showHttp && hiddenCount > 0 ? ` (${hiddenCount})` : ""}
          </label>
          <span className="text-xs text-ink-faint">{rows.length} shown · latest {logs.length}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading the audit trail…</div>
        ) : error ? (
          <ErrorState
            title="Couldn’t load the audit trail"
            message="The audit log failed to load. This is not the same as “no activity” — please retry."
            onRetry={() => { setLoading(true); setError(false); setTick((t) => t + 1); }}
            retrying={loading}
          />
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="mx-auto h-12 w-12 text-ink-ghost" />
            <h3 className="mt-4 text-sm font-semibold text-ink">
              {logs.length === 0 ? "No audit entries yet" : "Nothing matches that filter"}
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              {logs.length === 0
                ? "Actions across the app will appear here as they happen."
                : "Try a different name, action, or module."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">When</th>
                  <th className="px-4 py-3 text-left font-semibold">Who</th>
                  <th className="px-4 py-3 text-left font-semibold">Module</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((x, i) => (
                  <tr key={i} className="border-t border-line-soft hover:bg-sunken/60">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{fmtWhen(x.when)}</td>
                    <td className={`px-4 py-3 font-semibold ${x.actor === "Unknown User" ? "text-ink-faint" : "text-ink"}`}>{x.actor}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${x.mod.cls}`}>
                        {x.mod.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${actionTone(x.action)}`}>{x.action}</span>
                      {x.http && x.method && (
                        <span className="ml-2 rounded bg-sunken px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-faint">{x.method}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-line-soft p-4">
                <span className="text-xs text-ink-muted">
                  Page {safePage} of {totalPages} · {rows.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                    disabled={safePage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrailPage;
