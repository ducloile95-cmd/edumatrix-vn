import { addDays, subDays } from "date-fns";
import { listAnnouncementsByStudents } from "@/services/firestore/announcements";
import { listAssignmentsByClass, listSubmissionsByStudents } from "@/services/firestore/assignments";
import { listAttendanceByStudents } from "@/services/firestore/attendance";
import { listInvoicesByStudents } from "@/services/firestore/invoices";
import { listPublicLessonPlansByClass } from "@/services/firestore/lessonPlans";
import { listScoresByStudent } from "@/services/firestore/scores";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getStudent } from "@/services/firestore/students";
import { getClass } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
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
  attendance: 50,
  invoicesPerStudent: 30,
  lessonPlansPerClass: 12,
  scoresPerStudent: 10,
  sessionsPerClass: 12,
  submissions: 100,
} as const;

export async function buildViewerDashboard(studentIds: string[]): Promise<ViewerDashboardData> {
  const studentResults = await Promise.all(studentIds.map(getStudent));
  const students = studentResults.filter((student): student is NonNullable<typeof student> => !!student);
  const classIds = [...new Set(students.flatMap((student) => student.currentClassIds ?? []))];

  const [classResults, courses] = await Promise.all([
    Promise.all(classIds.map(getClass)),
    listCourses(),
  ]);
  const classes = classResults.filter((klass): klass is NonNullable<typeof klass> => !!klass);

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
    Promise.all(classIds.map((id) => listPublicLessonPlansByClass(id, DASHBOARD_LIMITS.lessonPlansPerClass))),
    Promise.all(classIds.map((id) => listAssignmentsByClass(id, DASHBOARD_LIMITS.assignmentsPerClass))),
    listSubmissionsByStudents(studentIds, DASHBOARD_LIMITS.submissions),
    Promise.all(studentIds.map((id) => listScoresByStudent(id, DASHBOARD_LIMITS.scoresPerStudent))),
    listAttendanceByStudents(studentIds, DASHBOARD_LIMITS.attendance),
    listInvoicesByStudents(studentIds, DASHBOARD_LIMITS.invoicesPerStudent),
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
    nextSessions: sessionGroups.flat().slice(0, 10),
    lessonPlans: lessonGroups.flat().slice(0, 10),
    pendingAssignments: assignments.filter((assignment) => !submitted.has(assignment.id)).slice(0, 10),
    latestScores: scores.slice(0, 10),
    attendance: attendance.slice(0, 10),
    unpaidInvoices: invoices.filter((invoice) => invoice.status !== "paid").slice(0, 10),
    announcements: announcements.slice(0, 20),
    updatedAt: null,
  };
}
