import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const PermissionContext = createContext(null);

// The resource+action catalog is product-defined and static per deploy — fetch
// it once per browser session and share it across every PermissionProvider
// mount, instead of re-fetching per user.
let catalogPromise = null;
function loadCatalogOnce() {
  if (!catalogPromise) {
    catalogPromise = api.get("/api/access-control/catalog").catch((err) => {
      catalogPromise = null; // allow a retry on next mount if it failed
      throw err;
    });
  }
  return catalogPromise;
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

/** { resource_code, actions } rows -> { [CODE]: Set<action> } for O(1) lookups. */
function buildPermissionMap(resources) {
  const map = {};
  for (const r of Array.isArray(resources) ? resources : []) {
    const code = r?.resource_code;
    if (!code) continue;
    map[String(code).toUpperCase()] = new Set((r.actions || []).map((a) => String(a).toLowerCase()));
  }
  return map;
}

export function PermissionProvider({ children }) {
  const { user } = useAuth();
  const mock = readMockPerms();

  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState({ key: null, isSuper: false, resources: [] });
  const [catalog, setCatalog] = useState([]);
  const reqKey = user ? `${user.id || user.auth_id || user.email || "user"}:${tick}` : null;

  useEffect(() => {
    // PermissionProvider wraps the whole app, including /login, so this
    // effect's first run can happen before a token exists — skip until a
    // user is present. `loadCatalogOnce` clears its cached promise on
    // failure, so this naturally retries after login rather than leaving
    // `catalog` stuck empty for the rest of the browser session.
    if (!user) return;
    loadCatalogOnce()
      .then((res) => setCatalog(Array.isArray(res) ? res : []))
      .catch((err) => console.error("[Permissions] Failed to load catalog:", err));
  }, [user]);

  useEffect(() => {
    if (!reqKey) return;
    let stale = false;
    (async () => {
      try {
        const res = await api.get("/api/access-control/me/permissions");
        if (!stale) {
          setLoaded({
            key: reqKey,
            isSuper: Boolean(res?.is_super),
            resources: Array.isArray(res?.resources) ? res.resources : [],
          });
        }
      } catch (err) {
        console.error("[Permissions] Failed to load effective permissions:", err);
        if (!stale) setLoaded({ key: reqKey, isSuper: false, resources: [] });
      }
    })();
    return () => {
      stale = true;
    };
  }, [reqKey]);

  const isAdmin = useMemo(() => {
    if (mock) return Boolean(mock.isAdmin);
    return loaded.isSuper;
  }, [mock, loaded.isSuper]);

  const permissionMap = useMemo(() => {
    if (mock) return buildPermissionMap(mock.resources || mock.permissions || []);
    return buildPermissionMap(loaded.resources);
  }, [mock, loaded.resources]);

  const ready = !user || !!mock || isAdmin || loaded.key === reqKey;

  const value = useMemo(() => {
    // resourceCode may be a single code or an array (e.g. a page fed by
    // several resources) — true if any one of them grants the action.
    const can = (resourceCode, action = "read") => {
      if (!user) return false;
      if (isAdmin) return true;
      if (!resourceCode) return true;
      if (Array.isArray(resourceCode)) return resourceCode.some((code) => can(code, action));
      const actions = permissionMap[String(resourceCode).toUpperCase()];
      if (!actions) return false;
      const normalized = String(action || "read").toLowerCase();
      return actions.has(normalized) || actions.has("manage");
    };

    const refreshPermissions = () => setTick((t) => t + 1);

    return { can, isAdmin, catalog, ready, refreshPermissions };
  }, [user, isAdmin, permissionMap, catalog, ready]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
}

export function useCan(resourceCode, action = "read") {
  return usePermissions().can(resourceCode, action);
}
