import { addDays, subDays } from "date-fns";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { listAssignmentsByClass, listSubmissionsByStudents } from "@/services/firestore/assignments";
import { listAttendanceByStudents } from "@/services/firestore/attendance";
import { listInvoicesByStudents } from "@/services/firestore/invoices";
import { listPublicLessonPlansByClass } from "@/services/firestore/lessonPlans";
import { listScoresByStudent } from "@/services/firestore/scores";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getStudent } from "@/services/firestore/students";

export interface ViewerDashboardData {
  studentIds: string[];
  nextSessions: Record<string, unknown>[];
  lessonPlans: Record<string, unknown>[];
  pendingAssignments: Record<string, unknown>[];
  latestScores: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  unpaidInvoices: Record<string, unknown>[];
  announcements: Record<string, unknown>[];
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

export async function getViewerDashboard(uid: string): Promise<ViewerDashboardData | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.VIEWER_DASHBOARDS, uid));
  return snap.exists() ? (snap.data() as ViewerDashboardData) : null;
}

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
    announcementGroups,
  ] = await Promise.all([
    Promise.all(classIds.map((id) => listSessionsByClass(id, subDays(new Date(), 1), addDays(new Date(), 30), DASHBOARD_LIMITS.sessionsPerClass))),
    Promise.all(classIds.map((id) => listPublicLessonPlansByClass(id, DASHBOARD_LIMITS.lessonPlansPerClass))),
    Promise.all(classIds.map((id) => listAssignmentsByClass(id, DASHBOARD_LIMITS.assignmentsPerClass))),
    listSubmissionsByStudents(studentIds, DASHBOARD_LIMITS.submissions),
    Promise.all(studentIds.map((id) => listScoresByStudent(id, DASHBOARD_LIMITS.scoresPerStudent))),
    listAttendanceByStudents(studentIds, DASHBOARD_LIMITS.attendance),
    listInvoicesByStudents(studentIds, DASHBOARD_LIMITS.invoicesPerStudent),
    Promise.all(
      studentIds.map(async (studentId) => {
        const snap = await getDocs(
          query(collection(db, COLLECTIONS.ANNOUNCEMENTS), where("studentId", "==", studentId), limit(DASHBOARD_LIMITS.announcementsPerStudent)),
        );
        return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      }),
    ),
  ]);
  const submitted = new Set(submissions.map((submission) => submission.assignmentId));

  return {
    studentIds,
    nextSessions: sessionGroups.flat().slice(0, 10) as unknown as Record<string, unknown>[],
    lessonPlans: lessonGroups.flat().slice(0, 10) as unknown as Record<string, unknown>[],
    pendingAssignments: assignmentGroups
      .flat()
      .filter((assignment) => !submitted.has(String(assignment.id)))
      .slice(0, 10) as unknown as Record<string, unknown>[],
    latestScores: scoreGroups.flat().slice(0, 10) as unknown as Record<string, unknown>[],
    attendance: attendance.slice(0, 10) as unknown as Record<string, unknown>[],
    unpaidInvoices: invoices.filter((invoice) => invoice.status !== "paid").slice(0, 10) as unknown as Record<
      string,
      unknown
    >[],
    announcements: announcementGroups.flat().slice(0, 20),
    updatedAt: null,
  };
}
