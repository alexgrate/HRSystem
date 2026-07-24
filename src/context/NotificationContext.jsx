import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { usePermissions } from "./PermissionContext";
import { auditService } from "../services/auditService";
import { leaveService } from "../services/leaveService";
import { loanService } from "../services/loanService";
import { appraisalReviewService } from "../services/appraisalService";
import { RESOURCE_CODES } from "../config/resourceCodes";
import { formatAuditLog, buildPersonalNotifications, loadReadSet, persistReadSet } from "../utils/notifications";

const NotificationContext = createContext({
  notifications: [], unreadCount: 0, loading: false, lastUpdated: null,
  markRead: () => {}, markAllRead: () => {}, refresh: () => {},
});

const READ_EVENT = "dash:notif-read"; // cross-widget/tab read-state sync

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { can, isAdmin, ready } = usePermissions();
  const myEmployeeId = user?.id || null;
  const canAudit = isAdmin || can(RESOURCE_CODES.AUDIT_LOGS, "read");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [readSet, setReadSet] = useState(loadReadSet);
  const inFlight = useRef(false);

  const fetchSource = useCallback(async () => {
    if (!user || !ready || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      let next = [];
      if (canAudit) {
        const logs = await auditService.list(30).catch(() => null);
        if (Array.isArray(logs)) next = logs.map(formatAuditLog);
      } else {
        const [reviews, leave, loans] = await Promise.all([
          appraisalReviewService.list().then((r) => (Array.isArray(r) ? r : [])).catch(() => []),
          leaveService.list().then((r) => (Array.isArray(r) ? r : [])).catch(() => []),
          loanService.listMine().then((r) => (Array.isArray(r) ? r : [])).catch(() => []),
        ]);
        next = buildPersonalNotifications({ reviews, leave, loans, myEmployeeId });
      }
      setItems(next.slice(0, 40));
      setLastUpdated(Date.now());
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [user, ready, canAudit, myEmployeeId]);

  // Initial + when identity/capability settles.
  useEffect(() => { fetchSource(); }, [fetchSource]);


  useEffect(() => {
    if (!user || !ready) return undefined;
    const onFocus = () => fetchSource();
    const onOnline = () => fetchSource();
    const onVisible = () => { if (document.visibilityState === "visible") fetchSource(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchSource();
    }, 120000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [user, ready, fetchSource]);

  useEffect(() => {
    const sync = () => setReadSet(loadReadSet());
    window.addEventListener(READ_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(READ_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const commitRead = useCallback((ids) => {
    setReadSet((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      persistReadSet(next);
      // Notify other consumers (header badge, other tabs) immediately.
      try { window.dispatchEvent(new Event(READ_EVENT)); } catch { /* no-op */ }
      return next;
    });
  }, []);

  const markRead = useCallback((id) => commitRead([id]), [commitRead]);
  const markAllRead = useCallback(() => commitRead(items.map((i) => i.id)), [commitRead, items]);

  const unreadCount = useMemo(() => items.reduce((n, i) => n + (readSet.has(i.id) ? 0 : 1), 0), [items, readSet]);

  const value = useMemo(() => ({
    notifications: items, readSet, unreadCount, loading, lastUpdated,
    markRead, markAllRead, refresh: fetchSource,
  }), [items, readSet, unreadCount, loading, lastUpdated, markRead, markAllRead, fetchSource]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => useContext(NotificationContext);
