import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus, Trash2, Pencil, Copy, Search, GitBranch, CheckCircle2, Play, Flag,
  AlertTriangle, ArrowUp, ArrowDown, Users, X, Layers,
} from "lucide-react";
import { setupService } from "../../services/setupService";
import { auditService } from "../../services/auditService";
import { usePermissions } from "../../context/PermissionContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { formatAuditLog } from "../../utils/notifications";

/* ------------------------------------------------------------------ helpers */

// The process types the backend actually supports (validateWorkflowType).
const WORKFLOW_TYPES = [
  { value: "LEAVE_REQUEST", label: "Leave Request" },
  { value: "PAYROLL_SUBMISSION", label: "Payroll Submission" },
  { value: "PAYROLL_LOCK_IN", label: "Payroll Lock-in" },
  { value: "PAYROLL_DISTRIBUTION", label: "Payroll Distribution" },
  { value: "EMPLOYEE_UPDATE", label: "Profile Update" },
  { value: "DOCUMENT_UPLOAD", label: "Document Upload" },
  { value: "LOAN_REQUEST", label: "Loan Request" },
];
const typeLabel = (t) => WORKFLOW_TYPES.find((x) => x.value === t)?.label || String(t || "System").replace(/_/g, " ");
const typeAccent = (t) => {
  const s = String(t || "").toUpperCase();
  if (s.includes("LEAVE")) return "emerald";
  if (s.includes("PAYROLL")) return "amber";
  if (s.includes("EMPLOYEE") || s.includes("PROFILE")) return "sky";
  if (s.includes("DOCUMENT")) return "rose";
  if (s.includes("LOAN")) return "violet";
  return "brand";
};
const ACCENT = {
  emerald: { bar: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-500/20" },
  amber: { bar: "bg-amber-500", soft: "bg-amber-50 text-amber-700", ring: "ring-amber-500/20" },
  sky: { bar: "bg-sky-500", soft: "bg-sky-50 text-sky-700", ring: "ring-sky-500/20" },
  rose: { bar: "bg-rose-500", soft: "bg-rose-50 text-rose-700", ring: "ring-rose-500/20" },
  violet: { bar: "bg-violet-500", soft: "bg-violet-50 text-violet-700", ring: "ring-violet-500/20" },
  brand: { bar: "bg-brand", soft: "bg-brand/10 text-brand", ring: "ring-brand/20" },
};
const fmtWhen = (v) => {
  if (!v) return "";
  const d = new Date(v); if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.round(diff / 86400000)}d ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/* -------------------------------------------------------------- stage timeline */

// A scalable VERTICAL stage timeline — reads clearly for 1 step or 20, on any
// width, instead of a cramped horizontal row.
function StageTimeline({ flow, roleName, gradeName }) {
  const steps = (flow?.steps || []).slice().sort((a, b) => a.step_order - b.step_order);
  const accent = ACCENT[typeAccent(flow?.workflow?.workflow_type)];
  return (
    <ol className="relative space-y-3">
      {/* Start */}
      <li className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-muted"><Play className="h-4 w-4" aria-hidden="true" /></span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Request submitted</span>
      </li>
      {steps.map((s) => (
        <li key={s.id || s.step_order} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${accent.bar}`}>{s.step_order}</span>
          </div>
          <div className={`min-w-0 flex-1 rounded-xl border border-line bg-card p-3 shadow-sm ring-1 ring-inset ${accent.ring}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Stage {s.step_order}</div>
                <div className="truncate text-sm font-semibold text-ink">{roleName(s.approver_job_role_id)}</div>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.require_all_approvers ? "bg-amber-50 text-amber-700" : "bg-sunken text-ink-muted"}`}>
                <Users className="h-3 w-3" aria-hidden="true" /> {s.require_all_approvers ? "All must approve" : "Any one approves"}
              </span>
            </div>
            {s.approver_grade_id && (
              <div className="mt-1.5 text-[11px] text-ink-muted">Grade: <b className="text-ink">{gradeName(s.approver_grade_id)}</b></div>
            )}
          </div>
        </li>
      ))}
      {/* Completion */}
      <li className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Flag className="h-4 w-4" aria-hidden="true" /></span>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Approved &amp; applied</span>
      </li>
    </ol>
  );
}

/* ==================================================================== page */

const WorkflowPage = () => {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const reduce = useReducedMotion();

  const [workflows, setWorkflows] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [grades, setGrades] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // {flow} edit/duplicate, {flow:null} create
  const [activity, setActivity] = useState(null); // null = no audit access

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sort, setSort] = useState("updated");

  const canCreate = can(RESOURCE_CODES.APPROVAL_WORKFLOWS, "create");
  const canUpdate = can(RESOURCE_CODES.APPROVAL_WORKFLOWS, "update");
  const canDelete = can(RESOURCE_CODES.APPROVAL_WORKFLOWS, "delete");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [wf, roles, grds] = await Promise.all([
        setupService.getWorkflows().then((r) => (Array.isArray(r) ? r : r?.data || [])),
        setupService.getJobRoles().then((r) => (Array.isArray(r) ? r : r?.data || [])),
        setupService.getGrades().then((r) => (Array.isArray(r) ? r : r?.data || [])).catch(() => []),
      ]);
      setWorkflows(wf || []); setJobRoles(roles || []); setGrades(grds || []);
    } catch (err) {
      setError(err?.message || "Couldn't load approval workflows.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Approval decisions from the org audit log (hidden entirely without access).
  useEffect(() => {
    let stale = false;
    auditService.list(200)
      .then((rows) => { if (stale) return;
        const decisions = (Array.isArray(rows) ? rows : []).filter((r) => String(r.action || "").startsWith("approval.") || r.resource_type === "approval_request");
        setActivity(decisions.slice(0, 8));
      })
      .catch(() => { /* keep null → panel hidden */ });
    return () => { stale = true; };
  }, []);

  const roleName = useCallback((id) => jobRoles.find((r) => r.id === id)?.title || jobRoles.find((r) => r.id === id)?.name || "Unassigned", [jobRoles]);
  const gradeName = useCallback((id) => grades.find((g) => g.id === id)?.name || "—", [grades]);

  const metrics = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((w) => w.workflow?.is_active).length;
    const stages = workflows.reduce((s, w) => s + (w.steps || []).length, 0);
    return { total, active, inactive: total - active, stages };
  }, [workflows]);

  const visible = useMemo(() => {
    let list = workflows.slice();
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((w) => String(w.workflow?.name || "").toLowerCase().includes(term) || typeLabel(w.workflow?.workflow_type).toLowerCase().includes(term));
    if (filterType !== "all") list = list.filter((w) => w.workflow?.workflow_type === filterType);
    if (filterStatus !== "all") list = list.filter((w) => (filterStatus === "active" ? w.workflow?.is_active : !w.workflow?.is_active));
    list.sort((a, b) => {
      if (sort === "name") return String(a.workflow?.name || "").localeCompare(String(b.workflow?.name || ""));
      if (sort === "stages") return (b.steps || []).length - (a.steps || []).length;
      if (sort === "newest") return String(b.workflow?.created_at || "").localeCompare(String(a.workflow?.created_at || ""));
      return String(b.workflow?.updated_at || "").localeCompare(String(a.workflow?.updated_at || "")); // updated
    });
    return list;
  }, [workflows, q, filterType, filterStatus, sort]);

  const activeFlow = visible.find((w) => w.workflow?.id === activeId) || visible[0] || null;

  const handleDelete = async (p) => {
    const ok = await confirm({
      title: `Delete "${p.workflow?.name || "this workflow"}"?`,
      message: "Requests already in progress keep their history and finish under the definition they started with, but new requests of this type won't be gated by it.",
      confirmLabel: "Delete", danger: true,
    });
    if (!ok) return;
    try { await setupService.deleteWorkflow(p.workflow?.id); toast.success("Workflow deleted."); load(); }
    catch (err) { toast.error(err?.message || "Couldn't delete the workflow."); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Approval Engine</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Approval Workflow Designer</h1>
          <p className="mt-1 text-sm text-ink-muted">Configure the multi-stage approval chain for each HR process.</p>
        </div>
        {canCreate && (
          <button onClick={() => setModal({ flow: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/20 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Plus className="h-4 w-4" aria-hidden="true" /> New workflow
          </button>
        )}
      </div>

      {/* Overview metrics — real, from loaded data */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Workflows", value: metrics.total, Icon: GitBranch },
          { label: "Active", value: metrics.active, Icon: CheckCircle2 },
          { label: "Inactive", value: metrics.inactive, Icon: X },
          { label: "Approval stages", value: metrics.stages, Icon: Layers },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold tracking-tight text-ink">{m.value}</div>
              <m.Icon className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar — search / filter / sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workflows…" aria-label="Search workflows"
            className="h-10 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter by process type" className="h-10 rounded-xl border border-line bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <option value="all">All types</option>
          {WORKFLOW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by status" className="h-10 rounded-xl border border-line bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="h-10 rounded-xl border border-line bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <option value="updated">Last updated</option>
          <option value="newest">Newest</option>
          <option value="name">Name A–Z</option>
          <option value="stages">Most stages</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-line-soft bg-card p-12 text-center text-sm text-ink-muted" role="status" aria-live="polite">Loading approval workflows…</div>
      ) : error ? (
        <div className="rounded-2xl border border-line-soft bg-card p-12 text-center" role="alert">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <button onClick={load} className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-sunken">Retry</button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-12 text-center">
          <GitBranch className="mx-auto h-10 w-10 text-ink-ghost" aria-hidden="true" />
          <h3 className="mt-3 text-sm font-semibold text-ink">No approval workflows yet</h3>
          <p className="mt-1 text-xs text-ink-muted">Create a workflow to route a process through one or more approval stages.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Workflow list */}
          <div className="space-y-2 lg:col-span-2">
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-line-soft bg-card p-8 text-center text-xs text-ink-faint">No workflows match your filters.</div>
            ) : visible.map((p) => {
              const accent = ACCENT[typeAccent(p.workflow?.workflow_type)];
              const selected = p.workflow?.id === activeFlow?.workflow?.id;
              return (
                <div key={p.workflow?.id} role="button" tabIndex={0}
                  onClick={() => setActiveId(p.workflow?.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveId(p.workflow?.id); } }}
                  aria-pressed={selected}
                  className={`cursor-pointer overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${selected ? "border-brand/40 ring-1 ring-brand/20" : "border-line/80 hover:border-line"}`}
                >
                  <div className={`-ml-4 -mt-4 mb-2 h-1 w-10 rounded-br ${accent.bar}`} aria-hidden="true" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold capitalize text-ink">{p.workflow?.name || "Unnamed workflow"}</div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-muted">{typeLabel(p.workflow?.workflow_type)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canCreate && (
                        <button onClick={() => setModal({ flow: p, duplicate: true })} title="Duplicate" aria-label="Duplicate workflow" className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Copy className="h-3.5 w-3.5" /></button>
                      )}
                      {canUpdate && (
                        <button onClick={() => setModal({ flow: p })} title="Edit" aria-label="Edit workflow" className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Pencil className="h-3.5 w-3.5" /></button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(p)} title="Delete" aria-label="Delete workflow" className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${accent.soft}`}>{(p.steps || []).length}-stage</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.workflow?.is_active ? "bg-emerald-50 text-emerald-700" : "bg-sunken text-ink-muted"}`}>{p.workflow?.is_active ? "Active" : "Inactive"}</span>
                    <span className="ml-auto text-[10px] text-ink-faint">{fmtWhen(p.workflow?.updated_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected workflow — vertical timeline */}
          <div className="lg:col-span-3">
            {activeFlow && (
              <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-sunken/50 to-card p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{typeLabel(activeFlow.workflow?.workflow_type)}</div>
                    <h3 className="truncate text-base font-bold capitalize text-ink">{activeFlow.workflow?.name || "Unnamed workflow"}</h3>
                  </div>
                  {canUpdate && <button onClick={() => setModal({ flow: activeFlow })} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
                </div>
                <StageTimeline flow={activeFlow} roleName={roleName} gradeName={gradeName} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity — human-readable via the centralized formatter */}
      {activity !== null && (
        <section aria-label="Recent approval decisions" className="rounded-2xl border border-line/80 bg-card shadow-sm">
          <div className="border-b border-line-soft p-5">
            <h2 className="font-semibold text-ink">Recent approval decisions</h2>
            <p className="text-xs text-ink-muted">The latest workflow decisions from the organization audit log.</p>
          </div>
          {activity.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-faint">No approval decisions recorded yet.</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {activity.map((r, i) => {
                const n = formatAuditLog({ id: r.id || i, action: r.action, resource_type: r.resource_type, created_at: r.time || r.created_at });
                return (
                  <li key={r.id || i} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink-2">{n.title}</div>
                      <div className="truncate text-xs text-ink-muted">{r.user_full_name || r.actor_name || r.performed_by_name || "System"}</div>
                    </div>
                    <div className="shrink-0 text-xs text-ink-faint">{fmtWhen(r.time || r.created_at)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <AnimatePresence>
        {modal && (
          <WorkflowFormModal
            flow={modal.flow}
            duplicate={modal.duplicate}
            reduce={reduce}
            existingNames={workflows.map((w) => String(w.workflow?.name || "").toLowerCase())}
            jobRoles={jobRoles}
            grades={grades}
            roleName={roleName}
            onClose={() => setModal(null)}
            onSaved={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* -------------------------------------------------------------- builder modal */

let stepSeq = 1;
const newStep = () => ({ uid: `s${stepSeq++}`, approver_job_role_id: "", approver_grade_id: "", require_all_approvers: false });

function WorkflowFormModal({ flow = null, duplicate = false, reduce, existingNames = [], jobRoles, grades, roleName, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!flow?.workflow?.id && !duplicate;
  const [name, setName] = useState(duplicate ? `${flow?.workflow?.name || ""} (copy)` : flow?.workflow?.name || "");
  const [workflowType, setWorkflowType] = useState(flow?.workflow?.workflow_type || "LEAVE_REQUEST");
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState(() => {
    const existing = (flow?.steps || []).slice().sort((a, b) => a.step_order - b.step_order).map((s) => ({
      uid: `s${stepSeq++}`,
      approver_job_role_id: s.approver_job_role_id || "",
      approver_grade_id: s.approver_grade_id || "",
      require_all_approvers: !!s.require_all_approvers,
    }));
    return existing.length ? existing : [newStep()];
  });

  const setStep = (uid, patch) => setSteps((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));
  const addStep = () => setSteps((prev) => [...prev, newStep()]);
  const removeStep = (uid) => setSteps((prev) => (prev.length === 1 ? prev : prev.filter((s) => s.uid !== uid)));
  const move = (idx, dir) => setSteps((prev) => {
    const next = prev.slice(); const j = idx + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[idx], next[j]] = [next[j], next[idx]]; return next;
  });

  // Live validation → warnings surfaced in the preview (PHASE 6/7).
  const warnings = useMemo(() => {
    const w = [];
    if (!name.trim()) w.push("Give the workflow a name.");
    else if (existingNames.includes(name.trim().toLowerCase()) && name.trim().toLowerCase() !== String(flow?.workflow?.name || "").toLowerCase())
      w.push("Another workflow already uses this name.");
    if (steps.length === 0) w.push("Add at least one approval stage.");
    steps.forEach((s, i) => {
      if (!s.approver_job_role_id) w.push(`Stage ${i + 1}: choose an approving job role.`);
    });
    return w;
  }, [name, steps, existingNames, flow]);
  const canSave = warnings.length === 0 && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), workflow_type: workflowType, is_active: true,
        steps: steps.map((s, idx) => ({
          step_order: idx + 1,
          approver_job_role_id: s.approver_job_role_id,
          approver_grade_id: s.approver_grade_id || null,
          require_all_approvers: !!s.require_all_approvers,
        })),
      };
      if (isEdit) { await setupService.updateWorkflow(flow.workflow.id, payload); toast.success("Workflow updated."); }
      else { await setupService.createWorkflow(payload); toast.success(duplicate ? "Workflow duplicated." : "Workflow created."); }
      onSaved?.(); onClose();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Couldn't save the workflow.");
    } finally { setSaving(false); }
  };

  // Close on Escape (standard modal a11y).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label={isEdit ? "Edit workflow" : "Create workflow"} onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: 12 }}
        className="my-8 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-ink">{isEdit ? `Edit: ${flow.workflow?.name}` : duplicate ? "Duplicate workflow" : "New approval workflow"}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Left: form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="wf-name" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Workflow name</label>
              <input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Manager → HR leave approval"
                className="mt-1 h-11 w-full rounded-xl border border-line px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
            </div>
            <div>
              <label htmlFor="wf-type" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Process type</label>
              <select id="wf-type" value={workflowType} onChange={(e) => setWorkflowType(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                {WORKFLOW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Approval stages</label>
                <button type="button" onClick={addStep} className="inline-flex items-center gap-1 text-xs font-bold text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Plus className="h-3 w-3" /> Add stage</button>
              </div>
              <div className="mt-2 space-y-2">
                {steps.map((s, index) => (
                  <div key={s.uid} className="rounded-xl border border-line-soft bg-sunken/40 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-xs font-bold text-ink-faint">Stage {index + 1}</span>
                      <select value={s.approver_job_role_id} onChange={(e) => setStep(s.uid, { approver_job_role_id: e.target.value })} aria-label={`Stage ${index + 1} approver role`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                        <option value="">— Approving job role —</option>
                        {jobRoles.map((r) => <option key={r.id} value={r.id}>{r.title || r.name}</option>)}
                      </select>
                      <div className="flex shrink-0 items-center">
                        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move stage up" className="rounded p-1 text-ink-faint hover:text-brand disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label="Move stage down" className="rounded p-1 text-ink-faint hover:text-brand disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => removeStep(s.uid)} disabled={steps.length === 1} aria-label="Remove stage" className="rounded p-1 text-ink-faint hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-12">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                        <input type="checkbox" checked={s.require_all_approvers} onChange={() => setStep(s.uid, { require_all_approvers: !s.require_all_approvers })} className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand" />
                        All holders must approve
                      </label>
                      {grades.length > 0 && (
                        <select value={s.approver_grade_id} onChange={(e) => setStep(s.uid, { approver_grade_id: e.target.value })} aria-label={`Stage ${index + 1} grade`} className="h-8 rounded-lg border border-line bg-card px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                          <option value="">Any grade</option>
                          {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="rounded-xl border border-line-soft bg-sunken/30 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Live preview</div>
            <ol className="space-y-2">
              <li className="flex items-center gap-2 text-xs text-ink-muted"><Play className="h-3.5 w-3.5" aria-hidden="true" /> Request submitted</li>
              {steps.map((s, i) => (
                <li key={s.uid} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">{i + 1}</span>
                  <span className="min-w-0 truncate text-xs text-ink">{s.approver_job_role_id ? roleName(s.approver_job_role_id) : <span className="text-amber-600">No approver</span>}{s.require_all_approvers ? " · all" : ""}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><Flag className="h-3.5 w-3.5" aria-hidden="true" /> Approved</li>
            </ol>
            {warnings.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-line-soft pt-2">
                {warnings.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" /> {w}</div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 lg:col-span-2">
            <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink-muted disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Cancel</button>
            <button type="submit" disabled={!canSave} className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">{saving ? "Saving…" : isEdit ? "Save changes" : "Create workflow"}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default WorkflowPage;
