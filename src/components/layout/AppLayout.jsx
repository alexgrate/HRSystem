import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LogOut, Search, Bell, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { useConfig } from "../../context/ConfigContext";
import { RESOURCES, pathFor } from "../../config/resources";
import { getEmployeeName, getInitials } from "../../utils/employee";

const displayName = (user) => getEmployeeName(user, "User");
const initials = getInitials;


const SidebarInner = ({ isMobile = false, collapsed, onToggleCollapse, onCloseMobile, items, onSignout }) => (
  <>
    <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f1a60] text-white font-bold">
          D
        </div>
        {(!collapsed || isMobile) && (
          <span className="font-bold text-slate-800 text-lg">dash.</span>
        )}
      </div>
      {isMobile ? (
        <button
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:block rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
        return (
          <NavLink
            key={item.key}
            to={pathFor(item)}
            className={({ isActive }) =>
              `relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-[#4f1a60] font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId={isMobile ? "nav-active-m" : "nav-active"}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#4f1a60]/10 to-[#8a2da8]/5 ring-1 ring-inset ring-[#4f1a60]/20"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative h-[18px] w-[18px] shrink-0" />
                {showLabel && <span className="relative">{item.label}</span>}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>

    <div className="border-t border-slate-100 p-3">
      <button
        onClick={onSignout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50/60">
      <aside
        className={`sticky top-0 z-30 hidden lg:flex h-screen flex-col border-r border-slate-200/80 bg-white transition-[width] duration-300 ${
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
              className="fixed left-0 top-0 z-50 flex h-screen w-[260px] max-w-[80vw] flex-col border-r border-slate-200/80 bg-white shadow-2xl lg:hidden"
            >
              <SidebarInner isMobile {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/70 px-3 sm:px-6 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm sm:px-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate text-xs font-semibold text-slate-700">
                {config?.organization_name || "Workspace"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden xl:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm w-72">
              <Search className="h-4 w-4" />
              <input
                placeholder="Search directory, leaves, adjustments…"
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
              />
            </div>

            <button className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:text-[#4f1a60]">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#4f1a60]" />
            </button>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm sm:pr-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f1a60] to-[#8a2da8] text-[11px] font-bold text-white">
                {initials(name)}
              </div>
              <div className="hidden sm:block text-xs leading-tight">
                <div className="font-semibold text-slate-900">{name}</div>
                <div className="text-[10px] text-slate-500">
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
