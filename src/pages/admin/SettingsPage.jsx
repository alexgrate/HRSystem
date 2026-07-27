import { useEffect, useMemo, useRef, useState } from "react";
import { TabPills } from "../../components/ui/TabPills";
import {
  Check,
  ShieldAlert,
  ShieldCheck,
  X,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  Users,
  Lock,
} from "lucide-react";
import { accessControlService } from "../../services/accessControlService";
import { usePermissions } from "../../context/PermissionContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";

const inputCls =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-line/80 bg-card shadow-sm ${className}`}>{children}</div>
);

const Loading = ({ label = "Loading…" }) => (
  <div className="p-12 text-center text-sm text-ink-muted">{label}</div>
);

const EmptyState = ({ Icon = ShieldAlert, title, hint }) => (
  <div className="p-12 text-center">
    <Icon className="mx-auto h-12 w-12 text-ink-ghost" />
    <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
    {hint ? <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">{hint}</p> : null}
  </div>
);

function Modal({ title, subtitle, onClose, children, maxW = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className={`w-full ${maxW} max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-ink">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const PrimaryBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const GhostBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-sunken disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const VIEWS = [
  { key: "roles", label: "Roles", Icon: ShieldCheck },
  { key: "permissions", label: "Role Permissions", Icon: Lock },
  { key: "assignments", label: "User Assignments", Icon: Users },
  { key: "job-titles", label: "Job Title Defaults", Icon: ShieldAlert },
];

export function SettingsPage() {
  const [view, setView] = useState("roles");
  // Views mount lazily on first visit, then stay mounted (hidden) so
  // switching back doesn't refetch and unsaved drafts survive.
  const [visited, setVisited] = useState({ roles: true });
  const switchView = (key) => {
    setVisited((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    setView(key);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Platform Security</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Access Management</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Create roles, decide exactly what each role can see and do, and assign roles to your people —
          everything here takes effect immediately, org-wide.
        </p>
      </div>

      <TabPills layoutId="settings-tab" active={view} onChange={switchView} tabs={VIEWS} />

      {visited.roles && <div className={view === "roles" ? "" : "hidden"}><RolesPanel /></div>}
      {visited.permissions && <div className={view === "permissions" ? "" : "hidden"}><RolePermissionsPanel /></div>}
      {visited.assignments && <div className={view === "assignments" ? "" : "hidden"}><UserAssignmentsPanel /></div>}
      {visited["job-titles"] && <div className={view === "job-titles" ? "" : "hidden"}><JobTitleDefaultsPanel /></div>}
    </div>
  );
}

/* ================================================================= Roles */

function RolesPanel() {
  const { isAdmin, refreshPermissions } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  // This whole page is Administrator-only (see resources.jsx's `adminOnly`) —
  // roles/permissions/assignments are a fixed admin capability, not part of
  // the grantable resource/action model, so `canManage` just mirrors that.
  const canManage = isAdmin;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // role or {} for new
  const [duplicating, setDuplicating] = useState(null); // role

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await accessControlService.listRoles();
      setRoles(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (role) => {
    if (role.is_system) return;
    const ok = await confirm({
      title: "Delete role?",
      message: `"${role.name}" will be permanently deleted. This only works if no one currently holds it.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await accessControlService.deleteRole(role.id);
      toast.success("Role deleted.");
      load();
      refreshPermissions?.();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to delete role.");
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-ink">Roles</h2>
          <p className="text-xs text-ink-muted">System roles (Administrator, HR Manager, Manager, Employee) can be re-configured but never deleted.</p>
        </div>
        {canManage && (
          <PrimaryBtn onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" /> New role
          </PrimaryBtn>
        )}
      </div>

      {loading ? (
        <Loading label="Loading roles…" />
      ) : error ? (
        <div className="p-12 text-center text-sm text-red-600">{error}</div>
      ) : roles.length === 0 ? (
        <EmptyState title="No roles yet" hint="Create your first role to start assigning permissions." />
      ) : (
        <div className="divide-y divide-line-soft">
          {roles.map((role) => (
            <div key={role.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{role.name}</span>
                  <span className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">{role.code}</span>
                  {role.is_system && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">System</span>
                  )}
                  {role.is_super && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Full access</span>
                  )}
                </div>
                {role.description && <p className="mt-0.5 text-xs text-ink-muted">{role.description}</p>}
                <p className="mt-0.5 text-[11px] text-ink-faint">{role.holder_count ?? 0} user{role.holder_count === 1 ? "" : "s"} assigned</p>
              </div>
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <GhostBtn onClick={() => setDuplicating(role)}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </GhostBtn>
                  <GhostBtn onClick={() => setEditing(role)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </GhostBtn>
                  <GhostBtn
                    onClick={() => remove(role)}
                    disabled={role.is_system}
                    title={role.is_system ? "System roles can't be deleted" : undefined}
                    className="border-red-200 text-red-600 hover:bg-red-50 disabled:border-line disabled:text-ink-faint"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </GhostBtn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RoleModal
          role={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onToast={toast}
        />
      )}

      {duplicating && (
        <DuplicateRoleModal
          role={duplicating}
          onClose={() => setDuplicating(null)}
          onSaved={() => {
            setDuplicating(null);
            load();
          }}
          onToast={toast}
        />
      )}
    </Card>
  );
}

function RoleModal({ role, onClose, onSaved, onToast }) {
  const [name, setName] = useState(role?.name || "");
  const [code, setCode] = useState(role?.code || "");
  const [description, setDescription] = useState(role?.description || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!role;

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isEdit && !code.trim()) {
      setError("Code is required.");
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await accessControlService.updateRole(role.id, { name: name.trim(), description: description || null });
      } else {
        await accessControlService.createRole({ name: name.trim(), code: code.trim(), description: description || null });
      }
      onToast.success(isEdit ? "Role updated." : "Role created.");
      onSaved();
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to save role.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit role" : "New role"} onClose={onClose}>
      {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payroll Officer" />
        </div>
        {!isEdit && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Code</label>
            <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. PAYROLL_OFFICER" />
          </div>
        )}
        {isEdit && role.is_system && (
          <p className="text-[11px] text-ink-faint">This is a system role — its code is locked, but you can rename it and edit its description.</p>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Description (optional)</label>
          <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
      </div>
    </Modal>
  );
}

function DuplicateRoleModal({ role, onClose, onSaved, onToast }) {
  const [name, setName] = useState(`${role.name} (Copy)`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    try {
      await accessControlService.duplicateRole(role.id, name.trim());
      onToast.success("Role duplicated.");
      onSaved();
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to duplicate role.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Duplicate "${role.name}"`} subtitle="Copies every permission this role grants into a new, independent role." onClose={onClose}>
      {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      <label className="mb-1 block text-xs font-semibold text-ink-muted">New role name</label>
      <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="mt-5 flex items-center justify-end gap-2">
        <GhostBtn onClick={onClose} disabled={busy}>Cancel</GhostBtn>
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Duplicating…" : "Duplicate"}</PrimaryBtn>
      </div>
    </Modal>
  );
}

/* ===================================================== Role Permissions */

function RolePermissionsPanel() {
  const { isAdmin, catalog, refreshPermissions } = usePermissions();
  const toast = useToast();
  const canManage = isAdmin;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [grantsByRole, setGrantsByRole] = useState({}); // roleId -> Set("CODE:action")
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [draft, setDraft] = useState(new Set());
  const editorReq = useRef(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await accessControlService.listRoles();
        setRoles(Array.isArray(rows) ? rows : []);
      } catch (err) {
        setError(err?.error?.message || err?.message || "Failed to load roles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ensureRoleLoaded = async (roleId) => {
    if (grantsByRole[roleId]) return grantsByRole[roleId];
    const grants = await accessControlService.getRolePermissions(roleId);
    const set = new Set((grants || []).map((g) => `${g.resource_code}:${g.action_code}`));
    setGrantsByRole((prev) => ({ ...prev, [roleId]: set }));
    return set;
  };

  const openEditor = async (role) => {
    const reqId = ++editorReq.current;
    setActiveRole(role);
    setDraft(new Set());
    if (role.is_super) return; // nothing to load — wildcard, no grants
    setModalLoading(true);
    try {
      const loaded = await ensureRoleLoaded(role.id);
      if (editorReq.current !== reqId) return;
      setDraft(new Set(loaded));
    } catch (err) {
      if (editorReq.current !== reqId) return;
      toast.error(err?.error?.message || err?.message || "Failed to load this role's permissions.");
      setActiveRole(null);
    } finally {
      if (editorReq.current === reqId) setModalLoading(false);
    }
  };

  const closeEditor = () => {
    editorReq.current += 1;
    setActiveRole(null);
  };

  const toggle = (resourceCode, actionCode) => {
    if (!canManage) return;
    const key = `${resourceCode}:${actionCode}`;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!activeRole || !canManage) return;
    setModalSaving(true);
    try {
      const grants = Array.from(draft).map((key) => {
        const idx = key.lastIndexOf(":");
        return { resource_code: key.slice(0, idx), action_code: key.slice(idx + 1) };
      });
      await accessControlService.setRolePermissions(activeRole.id, grants);
      setGrantsByRole((prev) => ({ ...prev, [activeRole.id]: new Set(draft) }));
      toast.success("Permissions updated.");
      refreshPermissions?.();
      closeEditor();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to save permissions.");
    } finally {
      setModalSaving(false);
    }
  };

  const grantCount = (roleId) => grantsByRole[roleId]?.size ?? null;

  if (loading) {
    return (
      <Card>
        <Loading label="Loading roles…" />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <div className="p-12 text-center text-sm text-red-600">{error}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!canManage && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <ShieldAlert className="h-3.5 w-3.5" /> Read-only — you need Manage rights on Roles &amp; Permissions.
        </div>
      )}

      <Card>
        <div className="border-b border-line-soft px-5 py-4">
          <h2 className="text-sm font-bold text-ink">Role Permissions</h2>
          <p className="text-xs text-ink-muted">Choose a role, then grant it exactly the resources and actions it needs.</p>
        </div>
        {roles.length === 0 ? (
          <EmptyState title="No roles yet" hint="Create a role first, under the Roles tab." />
        ) : (
          <div className="space-y-2 p-4 sm:p-5">
            {roles.map((role) => {
              const count = role.is_super ? null : grantCount(role.id);
              return (
                <div key={role.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      {role.name}
                      {role.is_super && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Full access</span>
                      )}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {role.is_super ? "Every permission, always — cannot be restricted" : count === null ? "Permissions not loaded yet" : `${count} permission${count === 1 ? "" : "s"} granted`}
                    </div>
                  </div>
                  <GhostBtn onClick={() => openEditor(role)}>
                    {role.is_super ? "View" : "Edit permissions"}
                  </GhostBtn>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {activeRole && (
        <Modal
          title={`Permissions: ${activeRole.name}`}
          subtitle={activeRole.is_super ? "This role always has full access." : "Enable the actions this role should be able to take, then save."}
          onClose={closeEditor}
          maxW="max-w-4xl"
        >
          {activeRole.is_super ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-6 text-center text-sm text-amber-800">
              Full-access roles bypass permission checks entirely, so there is nothing to configure here.
            </div>
          ) : modalLoading ? (
            <Loading label="Loading permissions…" />
          ) : (
            <div className="max-h-[calc(90vh-220px)] space-y-4 overflow-y-auto">
              {catalog.map((mod) => (
                <div key={mod.id} className="rounded-xl border border-line overflow-hidden">
                  <div className="bg-sunken px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{mod.label}</div>
                  <div className="divide-y divide-line-soft">
                    {mod.resources.map((resource) => (
                      <div key={resource.code} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-ink">{resource.name}</div>
                          <div className="text-[11px] font-mono text-ink-faint">{resource.code}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {resource.actions.map((action) => {
                            const on = draft.has(`${resource.code}:${action.code}`);
                            return (
                              <button
                                key={action.code}
                                type="button"
                                title={action.label}
                                disabled={!canManage}
                                onClick={() => toggle(resource.code, action.code)}
                                className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-all ${
                                  on ? "border-brand bg-brand text-white" : "border-line bg-card text-ink-faint hover:border-ink-faint"
                                } ${!canManage ? "cursor-not-allowed opacity-60" : ""}`}
                              >
                                {on ? <Check className="mr-1 inline h-3 w-3" /> : null}
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!activeRole.is_super && (
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-line-soft pt-4">
              <GhostBtn onClick={closeEditor} disabled={modalSaving}>Cancel</GhostBtn>
              <PrimaryBtn onClick={save} disabled={!canManage || modalLoading || modalSaving}>
                {modalSaving ? "Saving…" : "Save permissions"}
              </PrimaryBtn>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ===================================================== User Assignments */

function UserAssignmentsPanel() {
  const { isAdmin, refreshPermissions } = usePermissions();
  const toast = useToast();
  const canManage = isAdmin;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [assigning, setAssigning] = useState(null); // employee_id
  const [pickerRoleId, setPickerRoleId] = useState("");
  const [busyKey, setBusyKey] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRows, roleRows] = await Promise.all([
        accessControlService.listUsersWithRoles(),
        accessControlService.listRoles(),
      ]);
      setUsers(Array.isArray(userRows) ? userRows : []);
      setRoles(Array.isArray(roleRows) ? roleRows : []);
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (!q.trim()) return users;
    const s = q.trim().toLowerCase();
    return users.filter((u) => [u.name, u.email, u.job_role_title].filter(Boolean).some((v) => v.toLowerCase().includes(s)));
  }, [users, q]);

  const assign = async (employeeId) => {
    if (!pickerRoleId) return;
    setBusyKey(`${employeeId}:assign`);
    try {
      await accessControlService.assignRoleToUser(employeeId, pickerRoleId);
      toast.success("Role assigned.");
      setAssigning(null);
      setPickerRoleId("");
      await load();
      refreshPermissions?.();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to assign role.");
    } finally {
      setBusyKey(null);
    }
  };

  const revoke = async (employeeId, roleId) => {
    setBusyKey(`${employeeId}:${roleId}`);
    try {
      await accessControlService.revokeRoleFromUser(employeeId, roleId);
      toast.success("Role revoked.");
      await load();
      refreshPermissions?.();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to revoke role.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-ink">User Assignments</h2>
          <p className="text-xs text-ink-muted">Assign one or more roles directly to a person. Roles inherited from their job title are shown greyed out.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="w-48 bg-transparent outline-none placeholder:text-ink-faint" />
        </div>
      </div>

      {loading ? (
        <Loading label="Loading users…" />
      ) : error ? (
        <div className="p-12 text-center text-sm text-red-600">{error}</div>
      ) : visible.length === 0 ? (
        <EmptyState Icon={Users} title="No users found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Person</th>
                <th className="px-4 py-3 text-left font-semibold">Job title</th>
                <th className="px-4 py-3 text-left font-semibold">Roles</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.employee_id} className="border-t border-line-soft align-top">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">{u.name}</div>
                    <div className="text-xs text-ink-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{u.job_role_title || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.direct_roles.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                          {r.name}
                          {canManage && (
                            <button
                              onClick={() => revoke(u.employee_id, r.id)}
                              disabled={busyKey === `${u.employee_id}:${r.id}`}
                              className="text-brand/60 hover:text-red-600"
                              title="Revoke"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      {u.inherited_roles
                        .filter((r) => !u.direct_roles.some((d) => d.id === r.id))
                        .map((r) => (
                          <span key={r.id} className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-semibold text-ink-faint" title="Inherited via job title">
                            {r.name} <span className="opacity-70">(job title)</span>
                          </span>
                        ))}
                      {u.direct_roles.length === 0 && u.inherited_roles.length === 0 && (
                        <span className="text-xs text-ink-faint">No roles assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <GhostBtn onClick={() => { setAssigning(u.employee_id); setPickerRoleId(""); }}>
                        <Plus className="h-3.5 w-3.5" /> Assign role
                      </GhostBtn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assigning && (
        <Modal title="Assign a role" onClose={() => setAssigning(null)}>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">Role</label>
          <select className={inputCls} value={pickerRoleId} onChange={(e) => setPickerRoleId(e.target.value)}>
            <option value="">Select a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <div className="mt-5 flex items-center justify-end gap-2">
            <GhostBtn onClick={() => setAssigning(null)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={() => assign(assigning)} disabled={!pickerRoleId || busyKey === `${assigning}:assign`}>
              {busyKey === `${assigning}:assign` ? "Assigning…" : "Assign"}
            </PrimaryBtn>
          </div>
        </Modal>
      )}
    </Card>
  );
}

/* =================================================== Job Title Defaults */

function JobTitleDefaultsPanel() {
  const { isAdmin } = usePermissions();
  const toast = useToast();
  const canManage = isAdmin;

  const [jobRoles, setJobRoles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeJobRole, setActiveJobRole] = useState(null);
  const [draft, setDraft] = useState(new Set());
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const editorReq = useRef(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [jrRes, roleRows] = await Promise.all([
          accessControlService.getJobRoles(),
          accessControlService.listRoles(),
        ]);
        const jr = Array.isArray(jrRes) ? jrRes : jrRes?.jobRoles || jrRes?.job_roles || [];
        setJobRoles(jr);
        setRoles(Array.isArray(roleRows) ? roleRows : []);
      } catch (err) {
        setError(err?.error?.message || err?.message || "Failed to load job titles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openEditor = async (jobRole) => {
    const reqId = ++editorReq.current;
    setActiveJobRole(jobRole);
    setDraft(new Set());
    setModalLoading(true);
    try {
      const current = await accessControlService.getJobTitleDefaultRoles(jobRole.id);
      if (editorReq.current !== reqId) return;
      setDraft(new Set((current || []).map((r) => r.id)));
    } catch (err) {
      if (editorReq.current !== reqId) return;
      toast.error(err?.error?.message || err?.message || "Failed to load default roles.");
      setActiveJobRole(null);
    } finally {
      if (editorReq.current === reqId) setModalLoading(false);
    }
  };

  const closeEditor = () => {
    editorReq.current += 1;
    setActiveJobRole(null);
  };

  const toggle = (roleId) => {
    if (!canManage) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const save = async () => {
    if (!activeJobRole || !canManage) return;
    setModalSaving(true);
    try {
      await accessControlService.setJobTitleDefaultRoles(activeJobRole.id, Array.from(draft));
      toast.success("Job title defaults updated.");
      closeEditor();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to save defaults.");
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <Card>
      <div className="border-b border-line-soft px-5 py-4">
        <h2 className="text-sm font-bold text-ink">Job Title Defaults</h2>
        <p className="text-xs text-ink-muted">
          Optional convenience: anyone with this job title automatically inherits these roles, on top of any
          roles assigned to them directly under User Assignments.
        </p>
      </div>

      {loading ? (
        <Loading label="Loading job titles…" />
      ) : error ? (
        <div className="p-12 text-center text-sm text-red-600">{error}</div>
      ) : jobRoles.length === 0 ? (
        <EmptyState title="No job titles configured" hint="Create job titles first, under Directory & Setups." />
      ) : (
        <div className="space-y-2 p-4 sm:p-5">
          {jobRoles.map((jr) => (
            <div key={jr.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-3">
              <div className="font-semibold text-ink">{jr.title}</div>
              <GhostBtn onClick={() => openEditor(jr)}>Default roles</GhostBtn>
            </div>
          ))}
        </div>
      )}

      {activeJobRole && (
        <Modal title={`Default roles: ${activeJobRole.title}`} onClose={closeEditor}>
          {modalLoading ? (
            <Loading label="Loading…" />
          ) : (
            <div className="space-y-1.5">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-sunken">
                  <input
                    type="checkbox"
                    checked={draft.has(role.id)}
                    disabled={!canManage}
                    onChange={() => toggle(role.id)}
                    className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-ink">{role.name}</span>
                  {role.is_super && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Full access</span>}
                </label>
              ))}
            </div>
          )}
          <div className="mt-5 flex items-center justify-end gap-2">
            <GhostBtn onClick={closeEditor} disabled={modalSaving}>Cancel</GhostBtn>
            <PrimaryBtn onClick={save} disabled={!canManage || modalLoading || modalSaving}>
              {modalSaving ? "Saving…" : "Save"}
            </PrimaryBtn>
          </div>
        </Modal>
      )}
    </Card>
  );
}
