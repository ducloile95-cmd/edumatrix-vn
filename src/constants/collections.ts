/**
 * Ten collection Firestore - tap trung mot noi duy nhat (A4.5, A12).
 * KHONG duoc doi ten sau khi da co production data.
 */
export const COLLECTIONS = {
  USERS: "users",
  INVITES: "invites",

  STUDENTS: "students",
  SUBJECTS: "subjects",
  COURSES: "courses",
  CLASSES: "classes",
  ENROLLMENTS: "enrollments",

  LESSON_PLANS: "lesson_plans",
  LESSON_PLAN_TEMPLATES: "lesson_plan_templates",
  SESSIONS: "sessions",

  ATTENDANCE: "attendance",
  ATTENDANCE_SUMMARIES: "attendance_summaries",

  ASSIGNMENTS: "assignments",
  ASSIGNMENT_SUMMARIES: "assignment_summaries",
  SUBMISSIONS: "submissions",

  SCORES: "scores",
  STUDENT_SUMMARIES: "student_summaries",

  INVOICES: "invoices",
  PAYMENTS: "payments",

  ANNOUNCEMENTS: "announcements",
  MESSAGE_OUTBOX: "message_outbox",
  MESSENGER_CONNECTIONS: "messenger_connections",

  VIEWER_DASHBOARDS: "viewer_dashboards",
  AUDIT_LOGS: "audit_logs",
} as const;

export const SETTINGS_DOC = {
  GENERAL: "settings/general",
  PAYMENT: "settings/payment",
  MESSENGER: "settings/messenger",
} as const;
