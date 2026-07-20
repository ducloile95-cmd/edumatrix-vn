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
  LESSON_PLAN_PUBLIC: "lesson_plan_public",
  LESSON_PLAN_TEMPLATES: "lesson_plan_templates",
  SESSIONS: "sessions",
  SESSION_INTERACTIONS: "session_interactions",
  SESSION_STUDENT_REVIEWS: "session_student_reviews",

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
  NOTIFICATION_READS: "notification_reads",
  MESSAGE_OUTBOX: "message_outbox",
  MESSENGER_CONNECTIONS: "messenger_connections",
  CHAT_THREADS: "chat_threads",
  FANPAGE_POSTS: "fanpage_posts",

  AUDIT_LOGS: "audit_logs",
} as const;

export const SETTINGS_DOC = {
  GENERAL: "settings/general",
  ACADEMIC: "settings/academic",
  PAYMENT: "settings/payment",
  INTEGRATIONS: "settings/integrations",
  MESSENGER: "settings/messenger",
} as const;
