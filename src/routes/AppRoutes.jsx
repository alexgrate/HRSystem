import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { PermissionProvider, usePermissions } from "../context/PermissionContext";
import { ConfigProvider } from "../context/ConfigContext";
import { NotificationProvider } from "../context/NotificationContext";
import { PlatformAuthProvider } from "../context/PlatformAuthContext";
import ProtectedRoute from "./ProtectedRoute";
import PlatformProtectedRoute from "./PlatformProtectedRoute";
import AppLayout from "../components/layout/AppLayout";
import PlatformLayout from "../components/layout/PlatformLayout";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import PlatformLoginPage from "../pages/platform/PlatformLoginPage";
import { RESOURCES, pathFor } from "../config/resources";

// Lazy, same as every RESOURCES-driven org page (see config/resources.jsx) —
// keeps Recharts and the platform pages out of the main bundle for the vast
// majority of users who only ever visit /app.
const PlatformDashboardPage = lazy(() => import("../pages/platform/PlatformDashboardPage"));
const PlatformOrganizationsPage = lazy(() => import("../pages/platform/PlatformOrganizationsPage"));

// Shown while a lazy route chunk downloads.
function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}

function IndexRedirect() {
  const { can, isAdmin } = usePermissions();
  const first = RESOURCES.find((r) => (r.adminOnly ? isAdmin : can(r.resource, r.action || "read")));
  return <Navigate to={first ? pathFor(first) : "/login"} replace />;
}

// The org-employee application — everything under this today (unchanged).
// Wrapped in its own AuthProvider/PermissionProvider/ConfigProvider, all of
// which assume an org-scoped employee — deliberately NOT shared with the
// platform-admin tree below.
function OrgApp() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <ConfigProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <NotificationProvider>
                    <AppLayout />
                  </NotificationProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<IndexRedirect />} />
              {RESOURCES.map((r) => {
                const Component = r.component;
                return (
                  <Route
                    key={r.key}
                    path={r.segment}
                    element={
                      <ProtectedRoute
                        resource={r.resource}
                        action={r.action || "read"}
                        adminOnly={Boolean(r.adminOnly)}
                      >
                        <Suspense fallback={<PageLoading />}>
                          <Component />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                );
              })}
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ConfigProvider>
      </PermissionProvider>
    </AuthProvider>
  );
}

// The platform-admin portal — a wholly separate identity/session (own token
// storage key, own axios instance, own auth context) from the org-employee
// app above. Access here is binary (any active platform_admins row), not
// resource/action RBAC, so there's no PermissionProvider/ConfigProvider here.
function PlatformApp() {
  return (
    <PlatformAuthProvider>
      <Routes>
        <Route path="login" element={<PlatformLoginPage />} />
        <Route
          element={
            <PlatformProtectedRoute>
              <PlatformLayout />
            </PlatformProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<PageLoading />}>
                <PlatformDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="organizations"
            element={
              <Suspense fallback={<PageLoading />}>
                <PlatformOrganizationsPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    </PlatformAuthProvider>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/platform/*" element={<PlatformApp />} />
        <Route path="/*" element={<OrgApp />} />
      </Routes>
    </BrowserRouter>
  );
}
