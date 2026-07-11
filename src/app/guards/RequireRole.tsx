import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { UserRole } from "@/types/user";
import { ROUTES } from "@/constants/routes";

interface RequireRoleProps {
  roles: UserRole[];
  children: ReactNode;
  /** Route de chuyen huong ve khi sai role thay vi bao loi (vd Viewer bam nham link Staff). */
  redirectTo?: string;
}

export function RequireRole({ roles, children, redirectTo }: RequireRoleProps) {
  const { role } = useAuth();

  if (!role || !roles.includes(role)) {
    return <Navigate to={redirectTo ?? ROUTES.ACCESS_DENIED} replace />;
  }

  return <>{children}</>;
}
