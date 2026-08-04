import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ROUTES } from "@/constants/routes";

/**
 * Chi la UX guard (dieu huong nhanh) - KHONG thay the Firestore Security
 * Rules, day van la lop bao mat that su (A16.3).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, isSignedIn, userDoc, profileError, claiming } = useAuth();

  if (loading || claiming) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSkeleton rows={4} className="w-64" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (profileError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center p-6">
        <ErrorState
          title="Không thể xác minh tài khoản"
          message="Hệ thống chưa tải được hồ sơ đăng nhập. Vui lòng thử lại; nếu lỗi tiếp diễn, liên hệ quản trị viên."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!userDoc) {
    return <Navigate to={ROUTES.ACCESS_DENIED} replace />;
  }

  if (userDoc.status === "disabled") {
    return <Navigate to={ROUTES.ACCOUNT_DISABLED} replace />;
  }

  return <>{children}</>;
}
