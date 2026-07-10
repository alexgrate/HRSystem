import React, { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, ScrollText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { auditService } from "../../services/auditService";
import { getEmployeeName } from "../../utils/employee";
import api from "../../services/api";

const when = (r) => r.created_at || r.timestamp || r.performed_at || r.occurred_at || null;
const actionOf = (r) => r.action || r.event || r.activity || r.type || "activity";
const entityOf = (r) => r.entity_type || r.resource_type || r.resource || r.table_name || "";
const entityIdOf = (r) => r.entity_id || r.resource_id || r.record_id || "";
const detailsOf = (r) => r.description || r.details || r.message || r.summary || "";
const actorIdOf = (r) =>
  r.employee_id || r.actor_id || r.performed_by_employee_id || r.performed_by || r.user_id || null;

const prettify = (s) =>
  String(s || "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const actionCls = (a) => {
  const s = String(a).toLowerCase();
  if (s.includes("delete") || s.includes("reject") || s.includes("deactivat")) return "bg-red-50 text-red-700";
  if (s.includes("create") || s.includes("add") || s.includes("upload") || s.includes("register")) return "bg-sky-50 text-sky-700";
  if (s.includes("approve") || s.includes("distribut") || s.includes("activat")) return "bg-emerald-50 text-emerald-700";
  if (s.includes("update") || s.includes("edit") || s.includes("assign") || s.includes("submit")) return "bg-violet-50 text-violet-700";
  if (s.includes("login") || s.includes("logout") || s.includes("auth")) return "bg-amber-50 text-amber-700";
  return "bg-sunken text-ink-muted";
};

const fmtWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const PAGE_SIZE = 25;

const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const rows = await auditService.list(500);
        if (!stale) setLogs(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error("[Audit] Failed to load audit logs:", err);
        if (!stale) setLogs([]);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    (async () => {
      try {
        const res = await api.get("/api/users/?page=1&limit=100");
        if (!stale) setStaff(Array.isArray(res) ? res : res?.users || []);
      } catch {
        /* actor names fall back to ids */
      }
    })();
    return () => { stale = true; };
  }, [tick]);

  const actorName = (row) => {
    const embedded = row.actor || row.employee || row.performed_by_employee;
    if (embedded && typeof embedded === "object") return getEmployeeName(embedded, "System");
    if (row.actor_name || row.employee_name) return row.actor_name || row.employee_name;
    const id = actorIdOf(row);
    const s = staff.find((u) => u.id === id || u.auth_id === id);
    if (s) return getEmployeeName(s);
    return row.actor_email || row.email || (id ? `${String(id).slice(0, 8)}…` : "System");
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return logs;
    const s = q.trim().toLowerCase();
    return logs.filter((r) =>
      [actorName(r), actionOf(r), entityOf(r), detailsOf(r)].join(" ").toLowerCase().includes(s)
    );
  }, [logs, q, staff]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Filter by person, action, or record…"
              className="w-full bg-transparent outline-none placeholder:text-ink-faint"
            />
          </div>
          <span className="text-xs text-ink-faint">{filtered.length} of {logs.length} entries · latest 500</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading the audit trail…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="mx-auto h-12 w-12 text-ink-ghost" />
            <h3 className="mt-4 text-sm font-semibold text-ink">
              {logs.length === 0 ? "No audit entries yet" : "Nothing matches that filter"}
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              {logs.length === 0
                ? "Actions across the app will appear here as they happen."
                : "Try a different name, action, or record type."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">When</th>
                  <th className="px-4 py-3 text-left font-semibold">Who</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Record</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const id = r.id || `${safePage}-${i}`;
                  const open = expandedId === id;
                  return (
                    <React.Fragment key={id}>
                      <tr
                        onClick={() => setExpandedId(open ? null : id)}
                        className="cursor-pointer border-t border-line-soft hover:bg-sunken/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{fmtWhen(when(r))}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{actorName(r)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${actionCls(actionOf(r))}`}>
                            {prettify(actionOf(r))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-2">
                          {prettify(entityOf(r)) || "—"}
                          {entityIdOf(r) && (
                            <span className="ml-1.5 font-mono text-[10px] text-ink-faint">{String(entityIdOf(r)).slice(0, 8)}</span>
                          )}
                        </td>
                        <td className="max-w-[320px] truncate px-4 py-3 text-ink-muted">{detailsOf(r) || "—"}</td>
                        <td className="px-4 py-3 text-ink-faint">
                          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t border-line-soft bg-sunken/40">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="max-h-64 overflow-auto rounded-xl bg-card p-3 font-mono text-[11px] leading-relaxed text-ink-2 border border-line">
{JSON.stringify(r, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-line-soft p-4">
                <span className="text-xs text-ink-muted">
                  Page {safePage} of {totalPages} · {filtered.length} entries
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