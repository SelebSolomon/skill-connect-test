import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { RoleName } from '../../types';

interface ProtectedRouteProps {
  roles?: RoleName[];
  redirectTo?: string;
}

export function ProtectedRoute({ roles, redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
