import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useIsMobile } from '../../hooks/useMobile';
import {
  LayoutDashboard, Users, UserCircle, GitBranch, Wallet, CalendarDays,
  ShieldCheck, LogOut, Search, Bell, ChevronLeft, Menu, X, Sparkles, UsersRound
} from 'lucide-react';

const menuItems = [
  { path: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Super Admin", "HR Administrator", "Line Manager", "Finance Approver", "Employee"] },
  { path: "/app/directory", label: "Employee Directory", icon: Users, roles: ["Super Admin", "HR Administrator", "Line Manager"] },
  { path: "/app/self-service", label: "Self-Service Portal", icon: UserCircle, roles: ["Employee", "Super Admin", "HR Administrator", "Line Manager", "Finance Approver"] },
  { path: "/app/workflows", label: "Approval Workflows", icon: GitBranch, roles: ["Super Admin", "HR Administrator", "Finance Approver", "Line Manager"] },
  { path: "/app/payroll", label: "Payroll & PITA Tax", icon: Wallet, roles: ["Super Admin", "HR Administrator", "Finance Approver"] },
  { path: "/app/leave", label: "Leave Administration", icon: CalendarDays, roles: ["Super Admin", "HR Administrator", "Line Manager", "Employee"] },
  { path: "/app/permissions", label: "Users & Permissions", icon: ShieldCheck, roles: ["Super Admin", "HR Administrator"] },
];

const AppLayout = () => {
  const { user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const visibleMenuItems = menuItems.filter(
    item => item.roles.includes(user.role)
  );

  const renderSidebarContents = (isMobileView = false) => (
    <>
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
        <div className="flex items-center gap-3 select-none">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4f1a60] text-white">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2.5">
              <path d="M4 14v-3a8 8 0 0 1 16 0v3" strokeLinecap="round" />
              <circle cx="4" cy="15" r="2" />
              <circle cx="20" cy="15" r="2" />
            </svg>
          </div>
          {(isMobileView || !collapsed) && (
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#4f1a60] leading-none">dash.</span>
              <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {user.tenantName || "HRIS SYSTEM"}
              </span>
            </div>
          )}
        </div>

        {isMobileView ? (
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:block rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showLabel = isMobileView || !collapsed;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "text-[#4f1a60]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={isMobileView ? "nav-active-m" : "nav-active"}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#4f1a60]/10 to-[#8a2da8]/5 ring-1 ring-inset ring-[#4f1a60]/20"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative h-[18px] w-[18px] shrink-0" />
              {showLabel && <span className="relative">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="h-[18px] w-[18px] text-slate-400" />
          {(isMobileView || !collapsed) && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-50/60">
      <aside
        className={`sticky top-0 z-30 hidden lg:flex h-screen flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl transition-[width] duration-300 ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        {renderSidebarContents(false)}
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
              {renderSidebarContents(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/70 px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm sm:px-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate text-xs font-semibold text-slate-700">{user.tenantName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm w-64 xl:w-72">
              <Search className="h-4 w-4" />
              <input
                placeholder="Search employees, leaves, payroll…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
              />
            </div>

            <button className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:text-[#4f1a60]">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#4f1a60]" />
            </button>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm sm:pr-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f1a60] to-[#8a2da8] text-[11px] font-bold text-white shadow-sm">
                {(user?.name || "User").split(" ").map((s) => s[0]).join("").slice(0, 2)}
              </div>
              <div className="hidden sm:block text-left text-xs leading-none">
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div className="mt-1 text-[9px] font-bold text-[#4f1a60] uppercase tracking-wider">{user.role}</div>
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