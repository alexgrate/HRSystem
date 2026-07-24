import { useEffect, useMemo, useRef, useState } from "react";
import { TabPills } from "../../components/ui/TabPills";
import { Check, ShieldAlert, ShieldCheck, X } from "lucide-react";
import {
  rolePermissionService,
  EMPTY_PERMS,
  PERMISSION_ACTIONS,
} from "../../services/rolePermissionService";
import { usePermissions } from "../../context/PermissionContext";
import { useToast } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";

const ACTIVE_CLASSES = {
  can_read: "border-emerald-500 bg-emerald-500 text-white",
  can_create: "border-sky-500 bg-sky-500 text-white",
  can_update: "border-violet-500 bg-violet-500 text-white",
  can_delete: "border-red-500 bg-red-500 text-white",
  can_manage: "border-amber-500 bg-amber-500 text-white",
};
const INACTIVE_CLASS = "border-line bg-card text-ink-faint hover:border-ink-faint";

const Legend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
    {PERMISSION_ACTIONS.map((a) => (
      <div key={a.key} className="flex items-center gap-1.5">
        <span className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white ${ACTIVE_CLASSES[a.key]}`}>{a.short}</span>
        {a.label}
      </div>
    ))}
  </div>
);

const VIEWS = [
  { key: "job-title-resources", label: "Job Title Resources", Icon: ShieldCheck },
];

export function SettingsPage() {
  const [view, setView] = useState("job-title-resources");
  // Views mount lazily on first visit, then stay mounted (hidden) so
  // switching back doesn't refetch and unsaved drafts survive — but a view
  // never fetches anything unless it's actually been opened.
  const [visited, setVisited] = useState({ "job-title-resources": true });
  const switchView = (key) => {
    setVisited((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    setView(key);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Platform Security</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink"> Roles Permissions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Directly assign system resources to each job title with fully customizable permissions.
        </p>
      </div>

      <TabPills layoutId="settings-tab" active={view} onChange={switchView} tabs={VIEWS} />

      {visited["job-title-resources"] && (
        <div className={view === "job-title-resources" ? "" : "hidden"}><JobTitleResourceMatrix /></div>
      )}
    </div>
  );
}

function JobTitleResourceMatrix() {
  const { can, refreshPermissions } = usePermissions();
  const toast = useToast();
  const canManage = can(RESOURCE_CODES.ROLE_PERMISSIONS, "assign") || can(RESOURCE_CODES.ROLE_PERMISSIONS, "manage");

  const [jobRoles, setJobRoles] = useState([]);
  const [resources, setResources] = useState([]);
  const [matrixByJobRole, setMatrixByJobRole] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeJobRole, setActiveJobRole] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalDraft, setModalDraft] = useState({});
  // Monotonic token for the editor's load: close/reopen bumps it, so a slow
  // fetch for a previously-opened role can't overwrite the current draft
  // (saving would then clobber this role's permissions with the other's).
  const editorReq = useRef(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rolesList, resourcesList] = await Promise.all([
          rolePermissionService.getJobRoles(),
          rolePermissionService.getSystemResources(),
        ]);

        const activeJobRoles = rolesList || [];
        const activeResources = resourcesList || [];
        setJobRoles(activeJobRoles);
        setResources(activeResources);

        setMatrixByJobRole({});
      } catch (err) {
        console.error("[SettingsPage] Error loading job-role resource matrix:", err);
        setError(err?.message || "Failed to load the job title resource matrix.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const groupedResources = useMemo(() => {
    const groups = new Map();
    for (const r of resources) {
      const key = r.module || "General";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    return Array.from(groups.entries());
  }, [resources]);

  const normalizePermCell = (res) => ({
    can_read: !!(res.can_read ?? res.canRead),
    can_create: !!(res.can_create ?? res.canCreate),
    can_update: !!(res.can_update ?? res.canUpdate ?? res.canModify),
    can_delete: !!(res.can_delete ?? res.canDelete),
    can_manage: !!(res.can_manage ?? res.canManage),
  });

  const ensureJobRoleLoaded = async (jobRoleId) => {
    if (matrixByJobRole[jobRoleId]) return matrixByJobRole[jobRoleId];
    const nextMap = {};
    const assigned = await rolePermissionService.getJobRoleResources(jobRoleId);
    (assigned || []).forEach((res) => {
      nextMap[res.resource_id] = normalizePermCell(res);
    });
    setMatrixByJobRole((prev) => ({ ...prev, [jobRoleId]: nextMap }));
    return nextMap;
  };

  const openEditor = async (jobRole) => {
    const reqId = ++editorReq.current;
    setActiveJobRole(jobRole);
    setModalDraft({});
    setModalLoading(true);
    try {
      const loaded = await ensureJobRoleLoaded(jobRole.id);
      if (editorReq.current !== reqId) return; // superseded by a close/reopen
      setModalDraft(loaded);
    } catch (err) {
      if (editorReq.current !== reqId) return;
      toast.error(err?.message || "Failed to load resources for this job title.");
      setActiveJobRole(null);
    } finally {
      if (editorReq.current === reqId) setModalLoading(false);
    }
  };

  const closeEditor = () => {
    editorReq.current += 1;
    setActiveJobRole(null);
  };

  const toggleDraft = (resourceId, actionKey) => {
    if (!canManage) return;
    const current = modalDraft[resourceId] || EMPTY_PERMS;
    setModalDraft((prev) => ({
      ...prev,
      [resourceId]: { ...current, [actionKey]: !current[actionKey] },
    }));
  };

  const saveDraft = async () => {
    if (!activeJobRole || !canManage) return;
    setModalSaving(true);
    try {
      const payload = resources.map((res) => ({
        resource_id: res.id,
        ...EMPTY_PERMS,
        ...(modalDraft[res.id] || {}),
      }));
      await rolePermissionService.setJobRoleResources(activeJobRole.id, payload);
      setMatrixByJobRole((prev) => ({ ...prev, [activeJobRole.id]: modalDraft }));
      refreshPermissions?.();
      toast.success("Resource permissions updated.");
      closeEditor();
    } catch (err) {
      toast.error(err?.message || "Failed to save resource permissions.");
    } finally {
      setModalSaving(false);
    }
  };

  const assignedCount = (jobRoleId) => {
    const roleMatrix = matrixByJobRole[jobRoleId];
    if (!roleMatrix) return null;
    return Object.values(roleMatrix).filter((cell) =>
      PERMISSION_ACTIONS.some((a) => !!cell[a.key])
    ).length;
  };

  if (loading) {
    return <div className="p-12 text-center text-ink-muted bg-card rounded-2xl border border-line-soft">Loading job title resource matrix...</div>;
  }

  if (error) {
    return (
      <div className="p-12 text-center border border-dashed border-red-200 rounded-2xl bg-red-50/40">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-300" />
        <h3 className="mt-4 text-sm font-semibold text-ink">{error}</h3>
      </div>
    );
  }

  if (resources.length === 0 || jobRoles.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-line rounded-2xl bg-card">
        <ShieldAlert className="mx-auto h-12 w-12 text-ink-ghost" />
        <h3 className="mt-4 text-sm font-semibold text-ink">No resources or job titles configured</h3>
        <p className="mt-1 text-xs text-ink-muted">Create job titles first, then configure resource access here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canManage && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <ShieldAlert className="h-3.5 w-3.5" /> Read-only - you need Assign or Manage rights on Role Permissions.
        </div>
      )}

      <Legend />

      <div className="rounded-2xl border border-line/80 bg-card shadow-sm p-4 sm:p-5">
        <div className="mb-4 text-xs text-ink-muted">
          Choose a job title, then assign resources in a focused editor.
        </div>
        <div className="space-y-2">
          {jobRoles.map((jr) => {
            const count = assignedCount(jr.id);
            return (
              <div key={jr.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{jr.title}</div>
                  <div className="text-xs text-ink-muted">
                    {count === null ? "Permissions not loaded yet" : `${count} resources assigned`}
                  </div>
                </div>
                <button
                  onClick={() => openEditor(jr)}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-sunken"
                >
                  Assign Resources
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {activeJobRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-card shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-ink">Assign Resources: {activeJobRole.title}</h3>
                <p className="text-xs text-ink-muted mt-0.5">Enable permissions per resource, then save.</p>
              </div>
              <button onClick={closeEditor} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Always-visible legend — the buttons it explains are right below. */}
            <div className="border-b border-line-soft bg-sunken/50 px-5 py-2.5">
              <Legend />
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              {modalLoading ? (
                <div className="p-10 text-center text-ink-muted">Loading resources...</div>
              ) : (
                <div className="space-y-4">
                  {groupedResources.map(([moduleName, mods]) => (
                    <div key={moduleName} className="rounded-xl border border-line overflow-hidden">
                      <div className="bg-sunken px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{moduleName}</div>
                      <div className="divide-y divide-line-soft">
                        {mods.map((resource) => {
                          const perms = modalDraft[resource.id] || EMPTY_PERMS;
                          return (
                            <div key={resource.id} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-ink">{resource.name}</div>
                                <div className="text-[11px] text-ink-muted font-mono">{resource.code}</div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {PERMISSION_ACTIONS.map((action) => {
                                  const on = perms[action.key];
                                  return (
                                    <button
                                      key={action.key}
                                      title={action.label}
                                      disabled={!canManage}
                                      onClick={() => toggleDraft(resource.id, action.key)}
                                      className={`flex h-8 w-8 items-center justify-center rounded-md border text-[10px] font-bold transition-all ${
                                        on ? ACTIVE_CLASSES[action.key] : INACTIVE_CLASS
                                      } ${!canManage ? "cursor-not-allowed opacity-60" : ""}`}
                                    >
                                      {on ? <Check className="h-3 w-3" /> : action.short}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-3">
              <button
                onClick={closeEditor}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-2"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                disabled={!canManage || modalLoading || modalSaving}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {modalSaving ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
