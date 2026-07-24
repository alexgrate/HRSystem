import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LogOut, Menu, X, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { useConfig } from "../../context/ConfigContext";
import { useNotifications } from "../../context/NotificationContext";
import { RESOURCES, pathFor } from "../../config/resources";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { getEmployeeName, getInitials } from "../../utils/employee";
import { isDesignatedApprover } from "../../utils/approvers";
import { approvalService } from "../../services/approvalService";
import { loanService } from "../../services/loanService";
import { setupService } from "../../services/setupService";

const displayName = (user) => getEmployeeName(user, "User");

const HeaderBell = () => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/app")}
      aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      className="relative rounded-full border border-line bg-card p-2 text-ink-muted shadow-sm transition-colors hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white" style={{ height: 16 }}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};


const SidebarInner = ({ isMobile = false, collapsed, onToggleCollapse, onCloseMobile, items, onSignout, logoUrl, orgName, badges = {} }) => (
  <>
    <div className="flex h-16 items-center justify-between border-b border-line-soft px-4">
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-line bg-card">
            <img src={logoUrl} alt={orgName || "Company logo"} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold">
            D
          </div>
        )}
        {(!collapsed || isMobile) && (
          <span className="truncate font-bold text-ink-2 text-lg">{orgName || "dash."}</span>
        )}
      </div>
      {isMobile ? (
        <button
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:block rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-ink-2"
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>

    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((item) => {
        const Icon = item.Icon;
        const showLabel = isMobile || !collapsed;
        const badge = badges[item.key] || 0;
        return (
          <NavLink
            key={item.key}
            to={pathFor(item)}
            className={({ isActive }) =>
              `relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-brand font-semibold"
                  : "text-ink-muted hover:bg-sunken hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId={isMobile ? "nav-active-m" : "nav-active"}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand/10 to-brand-2/5 ring-1 ring-inset ring-brand/20"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative h-[18px] w-[18px] shrink-0" />
                {showLabel && <span className="relative">{item.label}</span>}
                {badge > 0 && showLabel && (
                  <span className="relative ml-auto min-w-[20px] rounded-full bg-amber-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
                {badge > 0 && !showLabel && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>

    <div className="border-t border-line-soft p-3">
      <button
        onClick={onSignout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-red-50 hover:text-red-700 transition-colors"
      >
        <LogOut className="h-[18px] w-[18px]" />
        {(isMobile || !collapsed) && <span>Sign out</span>}
      </button>
    </div>
  </>
);

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { can, canAccess, isAdmin } = usePermissions();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [approverFlows, setApproverFlows] = useState(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Workflows are fetched once — the badge only counts queues this user is a
  // designated approver for (same rule that shows the approve buttons).
  useEffect(() => {
    let stale = false;
    setupService.getWorkflows()
      .then((flows) => { if (!stale) setApproverFlows(Array.isArray(flows) ? flows : null); })
      .catch(() => { /* fall back to permission-only counting */ });
    return () => { stale = true; };
  }, []);

  // Pending-approvals badge: refreshed on navigation and every 90s, so the
  // number stays honest while working on other pages.
  useEffect(() => {
    let stale = false;
    const load = async () => {
      const jobs = [];
      if (can(RESOURCE_CODES.LEAVE_REQUESTS, "manage") && isDesignatedApprover(approverFlows, "LEAVE_REQUEST", user, isAdmin))
        jobs.push(approvalService.getPendingLeave().catch(() => []));
      if (can(RESOURCE_CODES.DOCUMENTS, "manage") && isDesignatedApprover(approverFlows, "DOCUMENT_UPLOAD", user, isAdmin))
        jobs.push(approvalService.getPendingDocuments().catch(() => []));
      if (can(RESOURCE_CODES.PROFILE_UPDATE, "manage") && isDesignatedApprover(approverFlows, "EMPLOYEE_UPDATE", user, isAdmin))
        jobs.push(approvalService.getPendingProfileUpdates().catch(() => []));
      if (can(RESOURCE_CODES.LOANS, "manage") && isDesignatedApprover(approverFlows, "LOAN_REQUEST", user, isAdmin))
        jobs.push(
          loanService.listAll()
            .then((rows) => (Array.isArray(rows) ? rows : []).filter((r) => String(r.status).toLowerCase() === "pending_approval"))
            .catch(() => [])
        );
      if (!jobs.length) {
        if (!stale) setPendingCount(0);
        return;
      }
      const lists = await Promise.all(jobs);
      if (!stale) setPendingCount(lists.flat().length);
    };
    load();
    const timer = setInterval(load, 90000);
    return () => { stale = true; clearInterval(timer); };
  }, [can, isAdmin, approverFlows, user, location.pathname]);

  const items = RESOURCES.filter((r) =>
    Array.isArray(r.checks) && r.checks.length
      ? canAccess(r.checks, "any")
      : can(r.resource, r.action || "read")
  );

  const name = displayName(user);

  const handleSignout = async () => {
    await logout();
    navigate("/login");
  };

  const sidebarProps = {
    collapsed,
    onToggleCollapse: () => setCollapsed((c) => !c),
    onCloseMobile: () => setMobileOpen(false),
    items,
    onSignout: handleSignout,
    logoUrl: config?.logo_url || null,
    orgName: config?.organization_name || null,
    badges: { approvals: pendingCount },
  };

  return (
    <div className="flex min-h-screen w-full bg-sunken/60">
      <aside
        className={`sticky top-0 z-30 hidden lg:flex h-screen flex-col border-r border-line/80 bg-card transition-[width] duration-300 ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        <SidebarInner {...sidebarProps} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed left-0 top-0 z-50 flex h-screen w-[260px] max-w-[80vw] flex-col border-r border-line/80 bg-card shadow-2xl lg:hidden"
            >
              <SidebarInner isMobile {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-line/80 bg-card/70 px-3 sm:px-6 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg border border-line bg-card p-2 text-ink-muted shadow-sm shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-card px-2.5 py-1.5 shadow-sm sm:px-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate text-xs font-semibold text-ink-2">
                {config?.organization_name || "Workspace"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <HeaderBell />
            <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-2 shadow-sm sm:pr-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-[11px] font-bold text-white">
                {getInitials(name)}
              </div>
              <div className="hidden sm:block text-xs leading-tight">
                <div className="font-semibold text-ink">{name}</div>
                <div className="text-[10px] text-ink-muted">
                  {isAdmin ? "Administrator" : "Employee"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
