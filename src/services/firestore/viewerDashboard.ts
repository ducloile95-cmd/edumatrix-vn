import { addDays, subDays } from "date-fns";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/client";
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
    Promise.all(classIds.map((id) => listSessionsByClass(id, subDays(new Date(), 1), addDays(new Date(), 30)))),
    Promise.all(classIds.map(listPublicLessonPlansByClass)),
    Promise.all(classIds.map(listAssignmentsByClass)),
    listSubmissionsByStudents(studentIds),
    Promise.all(studentIds.map(listScoresByStudent)),
    listAttendanceByStudents(studentIds),
    listInvoicesByStudents(studentIds),
    Promise.all(
      studentIds.map(async (studentId) => {
        const snap = await getDocs(
          query(collection(db, COLLECTIONS.ANNOUNCEMENTS), where("studentId", "==", studentId), limit(50)),
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
