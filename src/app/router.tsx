import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { RequireAuth } from "@/app/guards/RequireAuth";
import { RequireRole } from "@/app/guards/RequireRole";
import { RoleRedirect } from "@/app/RoleRedirect";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { AppShell } from "@/components/layouts/AppShell";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { PublicPageMotion } from "@/components/motion/PublicPageMotion";
import { RouteMotionProvider } from "@/components/motion/RouteMotionProvider";
import { useDelayedPending } from "@/hooks/useDelayedPending";

// Lazy load tung page de tach bundle theo route (React.lazy + Suspense).
const LandingPage = lazy(() => import("@/features/landing/pages/LandingPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const PrivacyPolicyPage = lazy(() => import("@/features/legal/pages/PrivacyPolicyPage"));
const DataDeletionPage = lazy(() => import("@/features/legal/pages/DataDeletionPage"));
const AccessDeniedPage = lazy(() => import("@/features/auth/pages/AccessDeniedPage"));
const AccountDisabledPage = lazy(() => import("@/features/auth/pages/AccountDisabledPage"));
const StaffDashboardPage = lazy(() => import("@/features/dashboard/pages/StaffDashboardPage"));
const ViewerDashboardPage = lazy(() => import("@/features/dashboard/pages/ViewerDashboardPage"));
const UsersPage = lazy(() => import("@/features/users/pages/UsersAdminPage"));
const CatalogPage = lazy(() => import("@/features/catalog/pages/CatalogPage"));
const StudentsPage = lazy(() => import("@/features/students/pages/StudentsPage"));
const ClassesPage = lazy(() => import("@/features/classes/pages/ClassesPage"));
const ClassDetailPage = lazy(() => import("@/features/classes/pages/ClassDetailPage"));
const SessionsPage = lazy(() => import("@/features/sessions/pages/SessionsPage"));
const ClassroomInteractionPage = lazy(() => import("@/features/classroom/pages/ClassroomInteractionPage"));
const LessonPlansPage = lazy(() => import("@/features/lesson-plans/pages/LessonPlansPage"));
const AttendancePage = lazy(() => import("@/features/attendance/pages/AttendancePage"));
const LearningPage = lazy(() => import("@/features/learning/pages/LearningPage"));
const ViewerAssignmentsPage = lazy(() => import("@/features/assignments/pages/ViewerAssignmentsPage"));
const InvoicesPage = lazy(() => import("@/features/invoices/pages/InvoicesPage"));
const MarketingPage = lazy(() => import("@/features/marketing/pages/MarketingPage"));
const ChatPage = lazy(() => import("@/features/announcements/pages/ChatPage"));
const ChatDemoPage = import.meta.env.DEV
  ? lazy(() => import("@/features/announcements/pages/ChatDemoPage"))
  : null;
const MotionDemoPage = import.meta.env.DEV
  ? lazy(() => import("@/features/demo/pages/MotionDemoPage"))
  : null;
const FormPopupDemoPage = import.meta.env.DEV
  ? lazy(() => import("@/features/demo/pages/FormPopupDemoPage"))
  : null;
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage"));
const ViewerTuitionPage = lazy(() => import("@/features/invoices/pages/ViewerTuitionPage"));
const ViewerSchedulePage = lazy(() => import("@/features/dashboard/pages/ViewerSchedulePage"));
const ViewerAnnouncementsPage = lazy(() => import("@/features/dashboard/pages/ViewerAnnouncementsPage"));
const ViewerScheduleDemoPage = import.meta.env.DEV
  ? lazy(() => import("@/features/dashboard/pages/ViewerScheduleDemoPage"))
  : null;

function RouteFallback() {
  const visible = useDelayedPending(true);
  if (!visible) return null;
  return (
    <div className="motion-content-enter p-6">
      <LoadingSkeleton rows={4} />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RouteMotionProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path={ROUTES.LANDING} element={<PublicPageMotion><LandingPage /></PublicPageMotion>} />
            <Route path={ROUTES.LOGIN} element={<PublicPageMotion><LoginPage /></PublicPageMotion>} />
          <Route path={ROUTES.PRIVACY_POLICY} element={<PublicPageMotion><PrivacyPolicyPage /></PublicPageMotion>} />
          <Route path={ROUTES.DATA_DELETION} element={<PublicPageMotion><DataDeletionPage /></PublicPageMotion>} />
          <Route path={ROUTES.ACCESS_DENIED} element={<PublicPageMotion><AccessDeniedPage /></PublicPageMotion>} />
          <Route path={ROUTES.ACCOUNT_DISABLED} element={<PublicPageMotion><AccountDisabledPage /></PublicPageMotion>} />
          {ViewerScheduleDemoPage && (
            <Route path={ROUTES.VIEWER_SCHEDULE_DEMO} element={<PublicPageMotion><ViewerScheduleDemoPage /></PublicPageMotion>} />
          )}
          {MotionDemoPage && (
            <Route path={ROUTES.MOTION_DEMO} element={<PublicPageMotion><MotionDemoPage /></PublicPageMotion>} />
          )}
          {FormPopupDemoPage && (
            <Route path={ROUTES.FORM_POPUP_DEMO} element={<PublicPageMotion><FormPopupDemoPage /></PublicPageMotion>} />
          )}
          {ChatDemoPage && (
            <Route path={ROUTES.STAFF_CHAT_DEMO} element={<PublicPageMotion><ChatDemoPage /></PublicPageMotion>} />
          )}

          {/*
            Layout route Staff: AppShell dat o day nen Sidebar/Topbar/dong ho chi mount 1 lan
            va khong bi dung lai khi chuyen tab. Cac redirect thuan tuy (Navigate) de ngoai
            vi chung khong can shell.
          */}
          <Route
            element={
              <RequireAuth>
                <RequireRole roles={[USER_ROLES.ADMIN, USER_ROLES.TEACHER]}>
                  <AppShell />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route path={ROUTES.STAFF_DASHBOARD} element={<StaffDashboardPage />} />
            <Route path={ROUTES.STAFF_STUDENTS} element={<StudentsPage />} />
            <Route path={ROUTES.STAFF_CLASSES} element={<ClassesPage />} />
            <Route path={ROUTES.STAFF_CLASS_DETAIL} element={<ClassDetailPage />} />
            <Route path={ROUTES.STAFF_CATALOG} element={<CatalogPage />} />
            <Route path={ROUTES.STAFF_SESSIONS} element={<SessionsPage />} />
            <Route path={ROUTES.STAFF_CLASSROOM} element={<ClassroomInteractionPage />} />
            <Route path={ROUTES.STAFF_CLASSROOM_DETAIL} element={<ClassroomInteractionPage />} />
            <Route path={ROUTES.STAFF_LESSON_PLANS} element={<LessonPlansPage />} />
            <Route path={ROUTES.STAFF_ATTENDANCE} element={<AttendancePage />} />
            <Route path={ROUTES.STAFF_LEARNING} element={<LearningPage />} />
            <Route path={ROUTES.STAFF_INVOICES} element={<InvoicesPage />} />
            <Route path={ROUTES.STAFF_CHAT} element={<ChatPage />} />
            <Route path={ROUTES.STAFF_SETTINGS} element={<SettingsPage />} />

            {/* Rieng module Nguoi dung va Marketing chi danh cho Admin - guard long them ben trong shell. */}
            <Route
              path={ROUTES.STAFF_USERS}
              element={
                <RequireRole roles={[USER_ROLES.ADMIN]} redirectTo={ROUTES.STAFF_DASHBOARD}>
                  <UsersPage />
                </RequireRole>
              }
            />
            <Route
              path={ROUTES.STAFF_MARKETING}
              element={
                <RequireRole roles={[USER_ROLES.ADMIN]} redirectTo={ROUTES.STAFF_DASHBOARD}>
                  <MarketingPage />
                </RequireRole>
              }
            />
          </Route>

          {/* Layout route Viewer: ViewerShell boc AppShell + BottomNavigation. */}
          <Route
            element={
              <RequireAuth>
                <RequireRole roles={[USER_ROLES.VIEWER]}>
                  <ViewerShell />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route path={ROUTES.VIEWER_DASHBOARD} element={<ViewerDashboardPage />} />
            <Route path={ROUTES.VIEWER_SCHEDULE} element={<ViewerSchedulePage />} />
            <Route path={ROUTES.VIEWER_ANNOUNCEMENTS} element={<ViewerAnnouncementsPage />} />
            <Route path={ROUTES.VIEWER_TUITION} element={<ViewerTuitionPage />} />
            <Route path={ROUTES.VIEWER_ASSIGNMENTS} element={<ViewerAssignmentsPage />} />
          </Route>

          <Route
            path={ROUTES.STAFF_ASSIGNMENTS}
            element={<Navigate to={`${ROUTES.STAFF_LEARNING}?tab=assignments`} replace />}
          />

          <Route
            path={ROUTES.STAFF_SCORES}
            element={<Navigate to={`${ROUTES.STAFF_LEARNING}?tab=gradebook`} replace />}
          />

          <Route
            path={ROUTES.STAFF_ANNOUNCEMENTS}
            element={<Navigate to={ROUTES.STAFF_CHAT} replace />}
          />

          {import.meta.env.DEV && (
            <Route
              path={ROUTES.STAFF_SETTINGS_DEMO}
              element={<Navigate to={ROUTES.STAFF_SETTINGS} replace />}
            />
          )}

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
      </RouteMotionProvider>
    </BrowserRouter>
  );
}
