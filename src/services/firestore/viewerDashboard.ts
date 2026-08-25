import { addDays, subDays } from "date-fns";
import { doc, getDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { refreshViewerDashboard } from "@/services/integrations/messenger";
import { listAnnouncementsByStudents } from "@/services/firestore/announcements";
import { listAssignmentPreviewByClass, listSubmissionPreviewsByStudents } from "@/services/firestore/assignments";
import { listAttendancePreviewsByStudents } from "@/services/firestore/attendance";
import { listInvoicePreviewsByStudents } from "@/services/firestore/invoices";
import { listPublicLessonPlanPreviewByClass } from "@/services/firestore/lessonPlans";
import { listScoresByStudent } from "@/services/firestore/scores";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getStudent } from "@/services/firestore/students";
import { listAccessibleClassesByIds } from "@/services/firestore/classes";
import { getCourse } from "@/services/firestore/courses";
import type {
  AnnouncementDoc,
  AssignmentDoc,
  AttendanceDoc,
  ClassDoc,
  CourseDoc,
  InvoiceDoc,
  ScoreDoc,
  SessionDoc,
  StudentDoc,
  SubmissionDoc,
} from "@/types/academic";

export interface ViewerDashboardData {
  studentIds: string[];
  students: (StudentDoc & { id: string })[];
  classes: (ClassDoc & { id: string })[];
  courses: (CourseDoc & { id: string })[];
  assignments: (AssignmentDoc & { id: string })[];
  submissions: (SubmissionDoc & { id: string })[];
  scores: (ScoreDoc & { id: string })[];
  attendanceHistory: (AttendanceDoc & { id: string })[];
  nextSessions: (SessionDoc & { id: string })[];
  lessonPlans: Record<string, unknown>[];
  pendingAssignments: (AssignmentDoc & { id: string })[];
  latestScores: (ScoreDoc & { id: string })[];
  attendance: (AttendanceDoc & { id: string })[];
  unpaidInvoices: (InvoiceDoc & { id: string })[];
  announcements: (AnnouncementDoc & { id: string })[];
  updatedAt: unknown;
}

const DASHBOARD_LIMITS = {
  announcementsPerStudent: 10,
  assignmentsPerClass: 25,
  attendancePerStudent: 50,
  invoicesPerStudent: 30,
  lessonPlansPerClass: 12,
  scoresPerStudent: 10,
  sessionsPerClass: 12,
  submissionsPerStudent: 100,
} as const;

export async function buildViewerDashboard(studentIds: string[], parentUid?: string): Promise<ViewerDashboardData> {
  if (parentUid) {
    await refreshViewerDashboard();
    const snapshot = await getDoc(doc(db, COLLECTIONS.VIEWER_DASHBOARD, parentUid));
    if (!snapshot.exists()) throw new Error("VIEWER_DASHBOARD_UNAVAILABLE");
    return snapshot.data() as ViewerDashboardData;
  }
  const studentResults = await Promise.all(studentIds.map(getStudent));
  const students = studentResults.filter((student): student is NonNullable<typeof student> => !!student);
  const requestedClassIds = [...new Set(students.flatMap((student) => student.currentClassIds ?? []))];
  const classes = await listAccessibleClassesByIds(requestedClassIds);
  const classIds = classes.map((klass) => klass.id);

  // Chỉ đọc đúng những khóa học mà lớp của học sinh tham chiếu tới. Trước đây
  // đây là listCourses() đọc toàn bộ collection, trong khi nơi tiêu thụ duy nhất
  // (ViewerDashboardPage) vốn đã lọc lại theo courseId của lớp - đọc thừa toàn bộ
  // phần còn lại. Đổi lại một round-trip: phải có classes rồi mới biết courseIds.
  const courseIds = [...new Set(classes.map((klass) => klass.courseId).filter(Boolean))];
  const courseResults = await Promise.all(courseIds.map(getCourse));
  const courses = courseResults.filter((course): course is NonNullable<typeof course> => !!course);

  const [
    sessionGroups,
    lessonGroups,
    assignmentGroups,
    submissions,
    scoreGroups,
    attendance,
    invoices,
    announcements,
  ] = await Promise.all([
    Promise.all(classIds.map((id) => listSessionsByClass(id, subDays(new Date(), 1), addDays(new Date(), 30), DASHBOARD_LIMITS.sessionsPerClass))),
    Promise.all(classIds.map((id) => listPublicLessonPlanPreviewByClass(id, DASHBOARD_LIMITS.lessonPlansPerClass))),
    Promise.all(classIds.map((id) => listAssignmentPreviewByClass(id, DASHBOARD_LIMITS.assignmentsPerClass))),
    listSubmissionPreviewsByStudents(studentIds, DASHBOARD_LIMITS.submissionsPerStudent),
    Promise.all(studentIds.map((id) => listScoresByStudent(id, DASHBOARD_LIMITS.scoresPerStudent))),
    listAttendancePreviewsByStudents(studentIds, DASHBOARD_LIMITS.attendancePerStudent),
    listInvoicePreviewsByStudents(studentIds, DASHBOARD_LIMITS.invoicesPerStudent),
    listAnnouncementsByStudents(studentIds, DASHBOARD_LIMITS.announcementsPerStudent),
  ]);
  const submitted = new Set(submissions.map((submission) => submission.assignmentId));
  const assignments = assignmentGroups.flat();
  const scores = scoreGroups.flat();

  return {
    studentIds,
    students,
    classes,
    courses,
    assignments,
    submissions,
    scores,
    attendanceHistory: attendance,
    nextSessions: sessionGroups.flat().sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis()),
    lessonPlans: lessonGroups.flat(),
    pendingAssignments: assignments.filter((assignment) => !submitted.has(assignment.id)),
    latestScores: scores,
    attendance,
    unpaidInvoices: invoices.filter((invoice) => invoice.status !== "paid"),
    announcements,
    updatedAt: null,
  };
}
