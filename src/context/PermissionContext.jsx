import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const PermissionContext = createContext(null);

const ACTIONS = {
  read: "read",
  view: "read",
  list: "read",
  download: "read",
  create: "create",
  submit: "create",
  upload: "create",
  initialize: "create",
  update: "update",
  modify: "update",
  activate: "update",
  deactivate: "update",
  publish: "update",
  archive: "update",
  delete: "delete",
  review: "review",
  approve: "review",
  reject: "review",
  assign: "assign",
  notify: "review",
  manage: "manage",
  admin: "manage",
};

const PERMISSION_KEY_TO_ACTION = {
  "module:view": "read",
  "module:configure": "manage",
  "module:admin": "manage",
  "page:view": "read",
  "page:export": "read",
  "page:filter": "read",

  "resource:list": "list",
  "resource:view": "view",
  "resource:create": "create",
  "resource:update": "update",
  "resource:delete": "delete",
  "resource:assign": "assign",
  "resource:approve": "approve",
  "resource:reject": "reject",
  "resource:seed": "create",
  "resource:initialize": "initialize",
  "resource:submit": "submit",
  "resource:review": "review",
  "resource:publish": "publish",
  "resource:archive": "archive",
  "resource:download": "download",
  "resource:upload": "upload",
  "resource:notify": "notify",

  "workflow:view": "view",
  "workflow:create": "create",
  "workflow:update": "update",
  "workflow:activate": "activate",
  "workflow:deactivate": "deactivate",
  "workflow:approve": "approve",
  "workflow:reject": "reject",
};

function normalizeAction(action) {
  if (!action) return "read";
  return ACTIONS[String(action).toLowerCase()] || "read";
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
  }
  return false;
}

function normalizePermissionFlags(p) {
  const read = !!(p.can_read ?? p.canRead);
  const create = !!(p.can_create ?? p.canCreate);
  const update = !!(p.can_update ?? p.canUpdate ?? p.canModify);
  const del = !!(p.can_delete ?? p.canDelete);
  const review = !!(p.can_review ?? p.canReview);
  const assign = !!(p.can_assign ?? p.canAssign);
  const manage = !!(p.can_manage ?? p.canManage);

  return {
    read,
    create,
    update,
    delete: del,
    review,
    assign,
    manage,
  };
}


function buildPermissionMap(permissions) {
  const map = {};
  const list = Array.isArray(permissions)
    ? permissions
    : Array.isArray(permissions?.resources)
      ? permissions.resources
      : [];

  if (!list.length) return map;

  for (const p of list) {
    const code = p.resource_code || p.code || p.resource?.code;
    if (!code) continue;
    map[String(code).toUpperCase()] = normalizePermissionFlags(p);
  }
  return map;
}

function readMockPerms() {
  if (!import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem("dash_mock_perms");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function PermissionProvider({ children }) {
  const { user } = useAuth();
  const mock = readMockPerms();

  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState({ key: null, rows: null });
  const reqKey = user ? `${user.id || user.auth_id || user.email || "user"}:${tick}` : null;

  useEffect(() => {
    if (!reqKey) return;
    let stale = false;
    (async () => {
      let rows = null;
      try {
        const res = await api.get("/api/role-permissions/me/resources");
        rows = Array.isArray(res)
          ? res
          : res?.resources || res?.data?.resources || res?.permissions || res?.items || null;

        if (Array.isArray(rows) && rows.length && rows.some((r) => !(r.resource_code || r.code || r.resource?.code))) {
          try {
            const cat = await api.get("/api/role-permissions/system-resources");
            const catalog = Array.isArray(cat) ? cat : cat?.resources || [];
            const codeById = Object.fromEntries(catalog.map((c) => [c.id, c.code]));
            rows = rows.map((r) => ({
              ...r,
              resource_code: r.resource_code || r.code || r.resource?.code || codeById[r.resource_id],
            }));
          } catch (joinErr) {
            console.error("[Permissions] Couldn't resolve resource codes from catalog:", joinErr);
          }
        }
      } catch (err) {
        console.error("[Permissions] Failed to load effective permissions:", err);
      }
      if (import.meta.env.DEV) {
        console.info("[Permissions] user flags:", { is_admin: user?.is_admin, isAdmin: user?.isAdmin, role: user?.role });
        console.info("[Permissions] effective rows:", rows);
      }
      if (!stale) setLoaded({ key: reqKey, rows: Array.isArray(rows) ? rows : null });
    })();
    return () => { stale = true; };
  }, [reqKey]);

  const isAdmin = useMemo(() => {
    if (mock) return toBoolean(mock.isAdmin);
    return toBoolean(user?.is_admin) || toBoolean(user?.isAdmin) || String(user?.role || "").toLowerCase() === "admin";
  }, [mock, user]);

  const effectiveRows = useMemo(() => {
    if (mock) return mock.permissions || [];
    if (Array.isArray(loaded.rows) && loaded.rows.length) return loaded.rows;
    if (Array.isArray(user?.roleResources) && user.roleResources.length) return user.roleResources;
    if (Array.isArray(user?.permissions) && user.permissions.length) return user.permissions;
    return [];
  }, [mock, loaded.rows, user]);

  const permissionMap = useMemo(
    () => buildPermissionMap(effectiveRows),
    [effectiveRows]
  );

  const value = useMemo(() => {
    const can = (resourceCode, action = "read") => {
      if (!user) return false;
      if (isAdmin) return true;
      if (!resourceCode) return true;
      // An array means "any of these resources grants access".
      if (Array.isArray(resourceCode)) return resourceCode.some((code) => can(code, action));
      const entry = permissionMap[String(resourceCode).toUpperCase()];
      if (!entry) return false;

      const normalizedAction = normalizeAction(action);
      switch (normalizedAction) {
        case "read":
          return entry.read || entry.manage;
        case "create":
          return entry.create || entry.manage;
        case "update":
          return entry.update || entry.manage;
        case "delete":
          return entry.delete || entry.update || entry.manage;
        case "review":
          return entry.review || entry.manage;
        case "assign":
          return entry.assign || entry.manage;
        case "manage":
          return entry.manage || entry.assign || entry.review;
        default:
          return false;
      }
    };

    const canForPermissions = (resourceCode, permissionKeys = [], options = {}) => {
      const keys = Array.isArray(permissionKeys) ? permissionKeys : [];
      if (!keys.length) return can(resourceCode, "read");

      const checks = keys
        .map((k) => PERMISSION_KEY_TO_ACTION[String(k).toLowerCase()])
        .filter(Boolean)
        .filter((a) => a !== "read");

      if (!checks.length) return can(resourceCode, "read");

      if (options.requireAll) return checks.every((action) => can(resourceCode, action));
      return checks.some((action) => can(resourceCode, action));
    };

    const canAccess = (checks = [], mode = "any") => {
      const list = Array.isArray(checks) ? checks : [];
      if (!list.length) return can(null, "read");

      const evaluator = (item) =>
        canForPermissions(item.resource, item.permissions || [], {
          requireAll: item.permissionMode === "all",
        });

      if (mode === "all") return list.every(evaluator);
      return list.some(evaluator);
    };

    return { can, canForPermissions, canAccess, isAdmin, permissionMap };
  }, [user, isAdmin, permissionMap]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
}

export function useCan(resourceCode, action = "read") {
  return usePermissions().can(resourceCode, action);
}
