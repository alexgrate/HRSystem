import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthContext";

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

  const isAdmin = mock
    ? !!mock.isAdmin
    : !!(user?.is_admin || user?.isAdmin);

  const permissionMap = useMemo(
    () => buildPermissionMap(mock ? mock.permissions : user?.permissions),
    [user, mock]
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
