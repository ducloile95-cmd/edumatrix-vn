import { ROUTES } from "@/constants/routes";

/**
 * Tai truoc chunk cua route khi nguoi dung mo y dinh bam (hover/focus tren Sidebar),
 * thay vi doi den luc click moi bat dau import().
 *
 * Tach ra module rieng (khong de trong router.tsx) de tranh vong lap import:
 * router -> AppShell -> Sidebar -> router.
 * import() da duoc trinh duyet cache nen goi lai nhieu lan khong ton them gi.
 */
export const ROUTE_PREFETCH: Record<string, () => void> = {
  [ROUTES.STAFF_DASHBOARD]: () => void import("@/features/dashboard/pages/StaffDashboardPage"),
  [ROUTES.STAFF_STUDENTS]: () => void import("@/features/students/pages/StudentsPage"),
  [ROUTES.STAFF_CLASSES]: () => void import("@/features/classes/pages/ClassesPage"),
  [ROUTES.STAFF_CATALOG]: () => void import("@/features/catalog/pages/CatalogPage"),
  [ROUTES.STAFF_SESSIONS]: () => void import("@/features/sessions/pages/SessionsPage"),
  [ROUTES.STAFF_CLASSROOM]: () => void import("@/features/classroom/pages/ClassroomInteractionPage"),
  [ROUTES.STAFF_LESSON_PLANS]: () => void import("@/features/lesson-plans/pages/LessonPlansPage"),
  [ROUTES.STAFF_ATTENDANCE]: () => void import("@/features/attendance/pages/AttendancePage"),
  [ROUTES.STAFF_LEARNING]: () => void import("@/features/learning/pages/LearningPage"),
  [ROUTES.STAFF_INVOICES]: () => void import("@/features/invoices/pages/InvoicesPage"),
  [ROUTES.STAFF_CHAT]: () => void import("@/features/announcements/pages/ChatPage"),
  [ROUTES.STAFF_CHAT_DEMO]: () => void import("@/features/announcements/pages/ChatDemoPage"),
  [ROUTES.STAFF_SETTINGS]: () => void import("@/features/settings/pages/SettingsPage"),
  [ROUTES.STAFF_USERS]: () => void import("@/features/users/pages/UsersAdminPage"),
  [ROUTES.VIEWER_DASHBOARD]: () => void import("@/features/dashboard/pages/ViewerDashboardPage"),
  [ROUTES.VIEWER_SCHEDULE]: () => void import("@/features/dashboard/pages/ViewerSchedulePage"),
  [ROUTES.VIEWER_ANNOUNCEMENTS]: () => void import("@/features/dashboard/pages/ViewerAnnouncementsPage"),
  [ROUTES.VIEWER_TUITION]: () => void import("@/features/invoices/pages/ViewerTuitionPage"),
  [ROUTES.VIEWER_ASSIGNMENTS]: () => void import("@/features/assignments/pages/ViewerAssignmentsPage"),
};

export function prefetchRoute(to: string): void {
  ROUTE_PREFETCH[to]?.();
}
