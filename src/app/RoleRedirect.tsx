import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/constants/routes";

/** Dieu huong "/" den dashboard dung role sau khi RequireAuth da xac nhan userDoc ton tai. */
export function RoleRedirect() {
  const { isStaff } = useAuth();
  return <Navigate to={isStaff ? ROUTES.STAFF_DASHBOARD : ROUTES.VIEWER_DASHBOARD} replace />;
}
