import { Navigate, useLocation } from 'react-router-dom';
import { usePlatformAuth } from '../context/PlatformAuthContext';

// Mirrors ProtectedRoute.jsx but checks PlatformAuthContext instead of the
// org-scoped RBAC model (can()/isAdmin) — platform-admin access is binary in
// this phase, not resource/action-gated.
const PlatformProtectedRoute = ({ children }) => {
  const { admin, loading } = usePlatformAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-sunken">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/platform/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PlatformProtectedRoute;
