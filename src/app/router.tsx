import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/app/guards/RequireAuth";
import { RequireRole } from "@/app/guards/RequireRole";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import LoginPage from "@/features/auth/pages/LoginPage";
import AccessDeniedPage from "@/features/auth/pages/AccessDeniedPage";
import AccountDisabledPage from "@/features/auth/pages/AccountDisabledPage";
import StaffDashboardPage from "@/features/dashboard/pages/StaffDashboardPage";
import ViewerDashboardPage from "@/features/dashboard/pages/ViewerDashboardPage";
import { RoleRedirect } from "@/app/RoleRedirect";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.ACCESS_DENIED} element={<AccessDeniedPage />} />
        <Route path={ROUTES.ACCOUNT_DISABLED} element={<AccountDisabledPage />} />

        <Route
          path={ROUTES.STAFF_DASHBOARD}
          element={
            <RequireAuth>
              <RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}>
                <StaffDashboardPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route
          path={ROUTES.VIEWER_DASHBOARD}
          element={
            <RequireAuth>
              <RequireRole roles={[USER_ROLES.VIEWER]}>
                <ViewerDashboardPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route
          path="/"
          element={
            <RequireAuth>
              <RoleRedirect />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
