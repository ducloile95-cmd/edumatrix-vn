import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ROUTES } from "@/constants/routes";

/**
 * Chi la UX guard (dieu huong nhanh) - KHONG thay the Firestore Security
 * Rules, day van la lop bao mat that su (A16.3).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, isSignedIn, userDoc } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSkeleton rows={4} className="w-64" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!userDoc) {
    return <Navigate to={ROUTES.ACCESS_DENIED} replace />;
  }

  if (userDoc.status === "disabled") {
    return <Navigate to={ROUTES.ACCOUNT_DISABLED} replace />;
  }

  return <>{children}</>;
}
