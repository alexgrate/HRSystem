import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { PermissionProvider, usePermissions } from "../context/PermissionContext";
import { ConfigProvider } from "../context/ConfigContext";
import { NotificationProvider } from "../context/NotificationContext";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../components/layout/AppLayout";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import { RESOURCES, pathFor } from "../config/resources";

// Shown while a lazy route chunk downloads.
function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}

function IndexRedirect() {
  const { can, canAccess } = usePermissions();
  const first = RESOURCES.find((r) =>
    Array.isArray(r.checks) && r.checks.length
      ? canAccess(r.checks, "any")
      : can(r.resource, r.action || "read")
  );
  return <Navigate to={first ? pathFor(first) : "/login"} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
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
                        checks={r.checks}
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
    </BrowserRouter>
  );
}
