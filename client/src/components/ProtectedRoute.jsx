import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthenticatedLayout from "./AuthenticatedLayout";

export function getRoleLandingPath(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "staff") return "/staff/dashboard";
  return "/customer/dashboard";
}

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Checking your session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleLandingPath(user.role)} replace />;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

export default ProtectedRoute;
