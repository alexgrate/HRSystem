import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LogOut, Menu, X, LayoutDashboard, Building2, FileSignature, HandCoins } from "lucide-react";
import { usePlatformAuth } from "../../context/PlatformAuthContext";

// Sibling to AppLayout.jsx, deliberately much simpler (no per-resource RBAC
// nav filtering, no badges) — the platform-admin portal's own sidebar/shell,
// entirely independent of the org-employee /app/* tree.
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", to: "/platform/dashboard", Icon: LayoutDashboard },
  { key: "organizations", label: "Organizations", to: "/platform/organizations", Icon: Building2 },
  { key: "loans", label: "Loans", to: "/platform/loans", Icon: HandCoins },
  { key: "loan-agreement", label: "Loan Agreement", to: "/platform/loan-agreement", Icon: FileSignature },
];

const getInitials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const SidebarInner = ({ isMobile = false, collapsed, onToggleCollapse, onCloseMobile, onSignout }) => (
  <>
    <div className="flex h-16 items-center justify-between border-b border-line-soft px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold">D</div>
        {(!collapsed || isMobile) && (
          <div className="truncate leading-tight">
            <div className="font-bold text-ink-2 text-sm">dash.</div>
            <div className="text-[10px] uppercase tracking-wider text-ink-faint">Platform Admin</div>
          </div>
        )}
      </div>
      {isMobile ? (
        <button onClick={onCloseMobile} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken">
          <X className="h-4 w-4" />
        </button>
      ) : (
        <button onClick={onToggleCollapse} className="hidden lg:block rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-ink-2">
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>

    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.Icon;
        const showLabel = isMobile || !collapsed;
        return (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) =>
              `relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "text-brand font-semibold" : "text-ink-muted hover:bg-sunken hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId={isMobile ? "platform-nav-active-m" : "platform-nav-active"}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand/10 to-brand-2/5 ring-1 ring-inset ring-brand/20"
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

const PlatformLayout = () => {
  const { admin, logout } = usePlatformAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignout = async () => {
    await logout();
    navigate("/platform/login");
  };

  const sidebarProps = {
    collapsed,
    onToggleCollapse: () => setCollapsed((c) => !c),
    onCloseMobile: () => setMobileOpen(false),
    onSignout: handleSignout,
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
              <div className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
              <span className="truncate text-xs font-semibold text-ink-2">Platform Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-2 shadow-sm sm:pr-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-[11px] font-bold text-white">
                {getInitials(admin?.name)}
              </div>
              <div className="hidden sm:block text-xs leading-tight">
                <div className="font-semibold text-ink">{admin?.name || "Admin"}</div>
                <div className="text-[10px] text-ink-muted">{admin?.email}</div>
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

export default PlatformLayout;
