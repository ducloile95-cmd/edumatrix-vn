/** Duong dan route tap trung - tranh hardcode string rai rac. */
export const ROUTES = {
  LOGIN: "/login",
  ACCESS_DENIED: "/access-denied",
  ACCOUNT_DISABLED: "/account-disabled",

  STAFF_DASHBOARD: "/app/dashboard",
  STAFF_USERS: "/app/users",
  STAFF_CATALOG: "/app/catalog",
  STAFF_STUDENTS: "/app/students",
  STAFF_CLASSES: "/app/classes",
  STAFF_CLASS_DETAIL: "/app/classes/:classId",
  STAFF_SESSIONS: "/app/sessions",
  STAFF_LESSON_PLANS: "/app/lesson-plans",
  STAFF_ATTENDANCE: "/app/attendance",
  STAFF_ASSIGNMENTS: "/app/assignments",
  STAFF_SCORES: "/app/scores",
  STAFF_INVOICES: "/app/invoices",
  STAFF_ANNOUNCEMENTS: "/app/announcements",
  VIEWER_DASHBOARD: "/portal/dashboard",
  VIEWER_ASSIGNMENTS: "/portal/assignments",
  VIEWER_TUITION: "/portal/tuition",
  VIEWER_SCHEDULE: "/portal/schedule",
  VIEWER_ANNOUNCEMENTS: "/portal/announcements",
} as const;

/** Duong dan chi tiet 1 lop - dung tai noi dieu huong (Link/navigate). */
export function classDetailPath(classId: string): string {
  return `/app/classes/${classId}`;
}

/** Mo Lich hoc (Timetable) da loc san theo 1 lop - dung tu nut "Xem lich" o Danh sach lop. */
export function sessionsForClassPath(classId: string): string {
  return `${ROUTES.STAFF_SESSIONS}?classId=${classId}`;
}
