import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthContext";

const PermissionContext = createContext(null);

const ACTIONS = {
  read: "can_read",
  create: "can_create",
  update: "can_update",
  delete: "can_delete",
  manage: "can_manage",
};


function buildPermissionMap(permissions) {
  const map = {};
  if (!Array.isArray(permissions)) return map;
  for (const p of permissions) {
    const code = p.resource_code || p.code || p.resource?.code;
    if (!code) continue;
    map[code] = {
      can_read: !!p.can_read,
      can_create: !!p.can_create,
      can_update: !!p.can_update,
      can_delete: !!p.can_delete,
      can_manage: !!p.can_manage,
    };
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
      const entry = permissionMap[resourceCode];
      if (!entry) return false;
      const field = ACTIONS[action];
      return field ? !!entry[field] : false;
    };

    return { can, isAdmin, permissionMap };
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
