import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCan } from '../context/PermissionContext';


const ProtectedRoute = ({ children, resource = null, action = 'read' }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const allowed = useCan(resource, action);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (resource && !allowed) {
    return (
      <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-white">
        You don’t have access to this module. Ask an administrator to grant the
        required permission.
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
