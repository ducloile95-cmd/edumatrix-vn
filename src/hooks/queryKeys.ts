/**
 * Factory tap trung ten query key cho React Query.
 *
 * Muc dich: tranh viet tay mang key rai rac o 28+ file (vd ["students"],
 * ["classes"]...) hien chi hoat dong dung nho trung ten theo thoi quen -
 * xem muc 3.9, docs/KE-HOACH-SUA-LOI-REVIEW-TONG-THE-17-07-2026.md.
 *
 * Ap dung dan khi co dip sua file do (thay `queryKey: ["students"]` bang
 * `queryKey: queryKeys.students()`), khong bat buoc doi het cac cho dang
 * dung mot lan - rui ro cao neu doi dong loat ma khong chay duoc build/test
 * de xac nhan khong sot cho nao.
 */
export const queryKeys = {
  students: () => ["students"] as const,
  classes: () => ["classes"] as const,
  courses: () => ["courses"] as const,
  subjects: () => ["subjects"] as const,
  users: (role?: string) => (role ? (["users", role] as const) : (["users"] as const)),
  invites: () => ["invites"] as const,
  assignments: () => ["assignments"] as const,
  assignmentSummaries: () => ["assignment-summaries"] as const,
  submissions: (assignmentId?: string) => (assignmentId ? (["submissions", assignmentId] as const) : (["submissions"] as const)),
  lessonPlans: () => ["lesson-plans"] as const,
  lessonPlanTemplates: () => ["lesson-plan-templates"] as const,
  sessionsByClass: (classId: string) => ["sessions-by-class", classId] as const,
  attendance: (sessionId: string) => ["attendance", sessionId] as const,
  attendanceOverview: () => ["attendance-overview"] as const,
  attendanceSummaries: () => ["attendance-summaries"] as const,
  invoices: () => ["invoices"] as const,
  payments: () => ["payments"] as const,
  settings: (docId: string) => ["settings", docId] as const,
  fanpagePosts: () => ["fanpage-posts"] as const,
  chatThreads: () => ["chat-threads"] as const,
  student: (id: string) => ["student", id] as const,
  viewerDashboard: (studentIds: string[]) => ["viewer-dashboard", studentIds] as const,
  viewerInvoices: (studentIds: string[]) => ["viewer-invoices", studentIds] as const,
};
