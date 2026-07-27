import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';

const ProtectedRoute = ({ children, resource = null, action = 'read', adminOnly = false }) => {
  const { user, loading } = useAuth();
  const { can, isAdmin, ready } = usePermissions();
  const location = useLocation();
  const allowed = adminOnly ? isAdmin : can(resource, action);

  if (loading || (user && !ready)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-sunken">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if ((resource || adminOnly) && !allowed) {
    return (
      <div className="p-8 text-center text-ink-muted border border-dashed border-line rounded-2xl bg-card">
        You don’t have access to this module. Ask an administrator to grant the
        required permission.
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
