import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Check, ShieldAlert, ShieldCheck, GitBranch } from "lucide-react";
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
const INACTIVE_CLASS = "border-slate-200 bg-white text-slate-400 hover:border-slate-400";

const VIEWS = [
  { key: "permissions", label: "Permissions", Icon: ShieldCheck },
  { key: "mapping", label: "Role Mapping", Icon: GitBranch },
];

export function SettingsPage() {
  const [view, setView] = useState("permissions");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">Platform Security</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Users &amp; Permissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          {view === "permissions"
            ? "Assign Create / Read / Update / Delete / Manage rights per system resource, for each role."
            : "Map each job title to the system roles it carries. Employees inherit permissions from their job title’s roles."}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm w-fit">
        {VIEWS.map((v) => {
          const Icon = v.Icon;
          return (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                view === v.key ? "text-white" : "text-slate-600"
              }`}
            >
              {view === v.key && (
                <motion.div layoutId="settings-tab" className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#4f1a60] to-[#8a2da8]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <Icon className="relative h-3.5 w-3.5" />
              <span className="relative">{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Both stay mounted so switching tabs doesn't refire the per-role
          permission loads — only visibility changes. */}
      <div className={view === "permissions" ? "" : "hidden"}><PermissionsMatrix /></div>
      <div className={view === "mapping" ? "" : "hidden"}><RoleMappingMatrix /></div>
    </div>
  );
}

// ── Tab 1: system role × resource (C/R/U/D/Manage) ──────────────────────────
function PermissionsMatrix() {
  const { can } = usePermissions();
  const toast = useToast();
  const canManage = can(RESOURCE_CODES.ROLE_PERMISSIONS, "manage");
  const [roles, setRoles] = useState([]);
  const [resources, setResources] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingRole, setSavingRole] = useState(null);

  // matrixRef always holds the freshest matrix so save payloads are never
  // built from a stale render snapshot; saveQueues serializes saves per role
  // so overlapping full-set POSTs can't overwrite each other server-side.
  const matrixRef = useRef({});
  const saveQueues = useRef({});
  const applyMatrix = (next) => {
    matrixRef.current = next;
    setMatrix(next);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rolesList, resourcesList] = await Promise.all([
          rolePermissionService.getSystemRoles(),
          rolePermissionService.getSystemResources(),
        ]);
        const activeRoles = rolesList || [];
        const activeResources = resourcesList || [];
        setRoles(activeRoles);
        setResources(activeResources);

        const matrixMap = {};
        await Promise.all(
          activeRoles.map(async (role) => {
            matrixMap[role.id] = {};
            try {
              const assigned = await rolePermissionService.getRoleResources(role.id);
              (assigned || []).forEach((res) => {
                matrixMap[role.id][res.resource_id] = {
                  can_read: !!res.can_read,
                  can_create: !!res.can_create,
                  can_update: !!res.can_update,
                  can_delete: !!res.can_delete,
                  can_manage: !!res.can_manage,
                };
              });
            } catch (err) {
              console.error(`Error loading permissions for role ${role.name}:`, err);
            }
          })
        );
        applyMatrix(matrixMap);
      } catch (err) {
        console.error("[SettingsPage] Error loading permissions matrix:", err);
        setError(err?.message || "Failed to load the permission matrix.");
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

  const toggle = (roleId, resourceId, actionKey) => {
    if (!canManage) return;
    const current = matrixRef.current[roleId]?.[resourceId] || EMPTY_PERMS;
    const nextCell = { ...current, [actionKey]: !current[actionKey] };
    applyMatrix({
      ...matrixRef.current,
      [roleId]: { ...matrixRef.current[roleId], [resourceId]: nextCell },
    });
    setSavingRole({ roleId, resourceId });

    const run = async () => {
      // Build the payload at send time from the freshest state, so a queued
      // save includes every toggle applied before it.
      const roleMatrix = matrixRef.current[roleId] || {};
      const fullSet = resources.map((res) => ({
        resource_id: res.id,
        ...EMPTY_PERMS,
        ...(roleMatrix[res.id] || {}),
      }));
      await rolePermissionService.setRoleResources(roleId, fullSet);
    };

    const prevQueue = saveQueues.current[roleId] || Promise.resolve();
    saveQueues.current[roleId] = prevQueue
      .then(run, run)
      .catch((err) => {
        console.error("[SettingsPage] Save failed, reverting:", err);
        // Revert only the failed cell — never a whole-matrix snapshot, which
        // would clobber other toggles made in the meantime.
        applyMatrix({
          ...matrixRef.current,
          [roleId]: { ...matrixRef.current[roleId], [resourceId]: current },
        });
        toast.error(err?.message || "Failed to update permission. Reverted.");
      })
      .finally(() => setSavingRole(null));
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">Loading permission matrix…</div>;
  }
  if (error) {
    return (
      <div className="p-12 text-center border border-dashed border-red-200 rounded-2xl bg-red-50/40">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-300" />
        <h3 className="mt-4 text-sm font-semibold text-slate-900">{error}</h3>
      </div>
    );
  }
  if (resources.length === 0 || roles.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
        <ShieldAlert className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-sm font-semibold text-slate-900">No roles or resources configured</h3>
        <p className="mt-1 text-xs text-slate-500">Initialize your backend setup tables to populate the security matrix.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canManage && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <ShieldAlert className="h-3.5 w-3.5" /> Read-only — you need Manage rights on Role Permissions to edit.
        </div>
      )}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Resource</th>
                {roles.map((r) => (
                  <th key={r.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#4f1a60] capitalize">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedResources.map(([moduleName, mods]) => (
                <React.Fragment key={moduleName}>
                  <tr className="bg-slate-50/40">
                    <td colSpan={roles.length + 1} className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{moduleName}</td>
                  </tr>
                  {mods.map((f, i) => (
                    <motion.tr key={f.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }} className="border-t border-slate-100">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-slate-800">
                        <div>{f.name}</div>
                        <div className="text-[10px] font-mono font-normal text-slate-400 uppercase tracking-wider mt-0.5">{f.code}</div>
                      </td>
                      {roles.map((r) => {
                        const perms = matrix[r.id]?.[f.id] || EMPTY_PERMS;
                        const isSaving = savingRole?.roleId === r.id && savingRole?.resourceId === f.id;
                        return (
                          <td key={r.id} className="px-3 py-3">
                            <div className={`flex justify-center gap-1 transition-opacity ${isSaving ? "opacity-40 pointer-events-none" : ""}`}>
                              {PERMISSION_ACTIONS.map((action) => {
                                const on = perms[action.key];
                                return (
                                  <button
                                    key={action.key}
                                    title={action.label}
                                    disabled={!canManage}
                                    onClick={() => toggle(r.id, f.id, action.key)}
                                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold transition-all ${on ? ACTIVE_CLASSES[action.key] : INACTIVE_CLASS} ${!canManage ? "cursor-not-allowed opacity-60" : ""}`}
                                  >
                                    {on ? <Check className="h-3 w-3" /> : action.short}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        {PERMISSION_ACTIONS.map((a) => (
          <div key={a.key} className="flex items-center gap-2">
            <span className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white ${ACTIVE_CLASSES[a.key]}`}>{a.short}</span>
            {a.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: job role × system role (the missing link) ────────────────────────
function RoleMappingMatrix() {
  const { can } = usePermissions();
  const toast = useToast();
  const canManage = can(RESOURCE_CODES.ROLE_MAPPING, "manage");
  const [systemRoles, setSystemRoles] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [map, setMap] = useState({}); // { [jobRoleId]: Set(systemRoleId) }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);

  // Same freshest-state + per-row queue discipline as PermissionsMatrix.
  const mapRef = useRef({});
  const saveQueues = useRef({});
  const applyMap = (next) => {
    mapRef.current = next;
    setMap(next);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sysRoles, jRoles] = await Promise.all([
          rolePermissionService.getSystemRoles(),
          rolePermissionService.getJobRoles(),
        ]);
        const activeSys = sysRoles || [];
        const activeJobs = jRoles || [];
        setSystemRoles(activeSys);
        setJobRoles(activeJobs);

        const mapping = {};
        await Promise.all(
          activeJobs.map(async (jr) => {
            mapping[jr.id] = new Set();
            try {
              const assigned = await rolePermissionService.getJobRoleRoles(jr.id);
              (assigned || []).forEach((r) => {
                const id = r.role_id || r.system_role_id || r.system_role?.id || r.id;
                if (id) mapping[jr.id].add(id);
              });
            } catch (err) {
              console.error(`Error loading roles for job role ${jr.title}:`, err);
            }
          })
        );
        applyMap(mapping);
      } catch (err) {
        console.error("[RoleMapping] Load failed:", err);
        setError(err?.message || "Failed to load role mapping.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (jobRoleId, systemRoleId) => {
    if (!canManage) return;
    const before = new Set(mapRef.current[jobRoleId] || []);
    const next = new Set(before);
    if (next.has(systemRoleId)) next.delete(systemRoleId);
    else next.add(systemRoleId);

    applyMap({ ...mapRef.current, [jobRoleId]: next });
    setSaving(`${jobRoleId}:${systemRoleId}`);

    const run = async () => {
      // Read at send time so queued saves include earlier toggles on this row.
      const roleIds = Array.from(mapRef.current[jobRoleId] || []);
      await rolePermissionService.setJobRoleRoles(jobRoleId, roleIds);
    };

    const prevQueue = saveQueues.current[jobRoleId] || Promise.resolve();
    saveQueues.current[jobRoleId] = prevQueue
      .then(run, run)
      .catch((err) => {
        console.error("[RoleMapping] Save failed, reverting:", err);
        // Revert only this row, not the whole map.
        applyMap({ ...mapRef.current, [jobRoleId]: before });
        toast.error(err?.message || "Failed to update role mapping. Reverted.");
      })
      .finally(() => setSaving(null));
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">Loading role mapping…</div>;
  }
  if (error) {
    return (
      <div className="p-12 text-center border border-dashed border-red-200 rounded-2xl bg-red-50/40">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-300" />
        <h3 className="mt-4 text-sm font-semibold text-slate-900">{error}</h3>
      </div>
    );
  }
  if (jobRoles.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
        <ShieldAlert className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-sm font-semibold text-slate-900">No job titles yet</h3>
        <p className="mt-1 text-xs text-slate-500">Create job titles under Directory → Job Titles first, then map them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canManage && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <ShieldAlert className="h-3.5 w-3.5" /> Read-only — you need Manage rights to edit role mapping.
        </div>
      )}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Job Title</th>
                {systemRoles.map((r) => (
                  <th key={r.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#4f1a60] capitalize">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobRoles.map((jr, i) => (
                <motion.tr key={jr.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-slate-800">
                    <div>{jr.title}</div>
                    {jr.code && <div className="text-[10px] font-mono font-normal text-slate-400 uppercase tracking-wider mt-0.5">{jr.code}</div>}
                  </td>
                  {systemRoles.map((r) => {
                    const on = map[jr.id]?.has(r.id);
                    const isSaving = saving === `${jr.id}:${r.id}`;
                    return (
                      <td key={r.id} className="px-3 py-3 text-center">
                        <button
                          disabled={!canManage}
                          onClick={() => toggle(jr.id, r.id)}
                          title={on ? "Remove role" : "Assign role"}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold transition-all ${
                            on ? "border-[#4f1a60] bg-[#4f1a60] text-white" : INACTIVE_CLASS
                          } ${!canManage ? "cursor-not-allowed opacity-60" : ""} ${isSaving ? "opacity-40 pointer-events-none" : ""}`}
                        >
                          {on ? <Check className="h-3 w-3" /> : ""}
                        </button>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Tick a cell to give a job title that system role. Employees with that job title then inherit every
        permission the role grants (from the Permissions tab).
      </p>
    </div>
  );
}
