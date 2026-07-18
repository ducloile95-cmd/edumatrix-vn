import { addDays, subDays } from "date-fns";
import { listAnnouncementsByStudents } from "@/services/firestore/announcements";
import { listAssignmentsByClass, listSubmissionsByStudents } from "@/services/firestore/assignments";
import { listAttendanceByStudents } from "@/services/firestore/attendance";
import { listInvoicesByStudents } from "@/services/firestore/invoices";
import { listPublicLessonPlansByClass } from "@/services/firestore/lessonPlans";
import { listScoresByStudent } from "@/services/firestore/scores";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getStudent } from "@/services/firestore/students";
import type { AnnouncementDoc, AssignmentDoc, AttendanceDoc, InvoiceDoc, ScoreDoc, SessionDoc } from "@/types/academic";

export interface ViewerDashboardData {
  studentIds: string[];
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
  const students = await Promise.all(studentIds.map(getStudent));
  const classIds = [...new Set(students.flatMap((student) => student?.currentClassIds ?? []))];

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

  return {
    studentIds,
    nextSessions: sessionGroups.flat().slice(0, 10),
    lessonPlans: lessonGroups.flat().slice(0, 10),
    pendingAssignments: assignmentGroups.flat().filter((assignment) => !submitted.has(assignment.id)).slice(0, 10),
    latestScores: scoreGroups.flat().slice(0, 10),
    attendance: attendance.slice(0, 10),
    unpaidInvoices: invoices.filter((invoice) => invoice.status !== "paid").slice(0, 10),
    announcements: announcements.slice(0, 20),
    updatedAt: null,
  };
}
