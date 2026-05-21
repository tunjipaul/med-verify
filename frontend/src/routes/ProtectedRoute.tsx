import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

type ProtectedRouteProps = {
  allowedRoles?: string[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/corper/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/corper/login" replace />;
  }

  return <Outlet />;
}
