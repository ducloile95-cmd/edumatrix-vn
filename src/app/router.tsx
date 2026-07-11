import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/app/guards/RequireAuth";
import { RequireRole } from "@/app/guards/RequireRole";
import { RoleRedirect } from "@/app/RoleRedirect";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";

// Lazy load tung page de tach bundle theo route (React.lazy + Suspense).
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const AccessDeniedPage = lazy(() => import("@/features/auth/pages/AccessDeniedPage"));
const AccountDisabledPage = lazy(() => import("@/features/auth/pages/AccountDisabledPage"));
const StaffDashboardPage = lazy(() => import("@/features/dashboard/pages/StaffDashboardPage"));
const ViewerDashboardPage = lazy(() => import("@/features/dashboard/pages/ViewerDashboardPage"));
const UsersPage = lazy(() => import("@/features/users/pages/UsersPage"));
const CatalogPage = lazy(() => import("@/features/catalog/pages/CatalogPage"));
const StudentsPage = lazy(() => import("@/features/students/pages/StudentsPage"));
const ClassesPage = lazy(() => import("@/features/classes/pages/ClassesPage"));
const ClassDetailPage = lazy(() => import("@/features/classes/pages/ClassDetailPage"));
const SessionsPage = lazy(() => import("@/features/sessions/pages/SessionsPage"));
const LessonPlansPage = lazy(() => import("@/features/lesson-plans/pages/LessonPlansPage"));
const AttendancePage = lazy(() => import("@/features/attendance/pages/AttendancePage"));
const AssignmentsPage = lazy(() => import("@/features/assignments/pages/AssignmentsPage"));
const ViewerAssignmentsPage = lazy(() => import("@/features/assignments/pages/ViewerAssignmentsPage"));
const ScoresPage = lazy(() => import("@/features/scores/pages/ScoresPage"));
const InvoicesPage = lazy(() => import("@/features/invoices/pages/InvoicesPage"));
const StaffAnnouncementsPage = lazy(() => import("@/features/announcements/pages/StaffAnnouncementsPage"));
const ViewerTuitionPage = lazy(() => import("@/features/invoices/pages/ViewerTuitionPage"));
const ViewerSchedulePage = lazy(() => import("@/features/dashboard/pages/ViewerSchedulePage"));
const ViewerAnnouncementsPage = lazy(() => import("@/features/dashboard/pages/ViewerAnnouncementsPage"));

function RouteFallback() {
  return (
    <div className="p-6">
      <LoadingSkeleton rows={4} />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
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
            path={ROUTES.STAFF_USERS}
            element={
              <RequireAuth>
                <RequireRole roles={[USER_ROLES.ADMIN]} redirectTo={ROUTES.STAFF_DASHBOARD}>
                  <UsersPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path={ROUTES.STAFF_CATALOG}
            element={
              <RequireAuth>
                <RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}>
                  <CatalogPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path={ROUTES.STAFF_STUDENTS}
            element={
              <RequireAuth>
                <RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}>
                  <StudentsPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path={ROUTES.STAFF_CLASSES}
            element={
              <RequireAuth>
                <RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}>
                  <ClassesPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path={ROUTES.STAFF_CLASS_DETAIL}
            element={
              <RequireAuth>
                <RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}>
                  <ClassDetailPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path={ROUTES.STAFF_SESSIONS}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}><SessionsPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.STAFF_LESSON_PLANS}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}><LessonPlansPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.STAFF_ATTENDANCE}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}><AttendancePage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.STAFF_ASSIGNMENTS}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}><AssignmentsPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.STAFF_SCORES}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}><ScoresPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.STAFF_INVOICES}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}><InvoicesPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.STAFF_ANNOUNCEMENTS}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}><StaffAnnouncementsPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.VIEWER_SCHEDULE}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.VIEWER]}><ViewerSchedulePage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.VIEWER_ANNOUNCEMENTS}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.VIEWER]}><ViewerAnnouncementsPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.VIEWER_TUITION}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.VIEWER]}><ViewerTuitionPage /></RequireRole></RequireAuth>}
          />

          <Route
            path={ROUTES.VIEWER_ASSIGNMENTS}
            element={<RequireAuth><RequireRole roles={[USER_ROLES.VIEWER]}><ViewerAssignmentsPage /></RequireRole></RequireAuth>}
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
      </Suspense>
    </BrowserRouter>
  );
}
