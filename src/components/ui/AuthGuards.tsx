import type { ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/ui/Feedback";

const isAdminRole = (role?: string) => role === "admin1" || role === "admin2";

export const RequireAuth = () => {
  const location = useLocation();
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <LoadingScreen message="Restoring your SmartMove session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
};

export const RequireAdmin = () => {
  const location = useLocation();
  const { isAuthenticated, isReady, user } = useAuth();

  if (!isReady) {
    return <LoadingScreen message="Checking admin access" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/discover" replace />;
  }

  return <Outlet />;
};

export const RedirectIfAuthenticated = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <LoadingScreen message="Checking your access" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/discover" replace />;
  }

  return children;
};
