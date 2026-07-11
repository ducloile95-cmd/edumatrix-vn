import { listSessions } from "@/services/firestore/sessions";
import { listClasses } from "@/services/firestore/classes";
import { listInvoices } from "@/services/firestore/invoices";
import { listAssignmentSummaries } from "@/services/firestore/assignments";
import { listAttendanceBySession } from "@/services/firestore/attendance";

export interface UpcomingSession {
  id: string;
  className: string;
  title: string;
  location: string;
  startAt: Date;
}

export interface StaffDashboard {
  today: { total: number; done: number; upcoming: number };
  absentToday: number;
  ungraded: number;
  pendingInvoices: number;
  upcomingSessions: UpcomingSession[];
}

function dayStart(now: Date): Date { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
function dayEnd(now: Date): Date { const d = new Date(now); d.setHours(23, 59, 59, 999); return d; }

/**
 * Tong hop overview cho Staff Dashboard bang cach tai su dung cac service da co.
 * Query live (staff it nguoi, react-query cache 60s) - khong can materialized view
 * nhu Viewer. "Vang hom nay" chi tinh tren cac buoi trong ngay (N nho).
 */
export async function getStaffDashboard(now: Date = new Date()): Promise<StaffDashboard> {
  const [sessions, classes, invoices, summaries] = await Promise.all([
    listSessions(dayStart(now), dayEnd(now)),
    listClasses(),
    listInvoices(),
    listAssignmentSummaries(),
  ]);

  const classNameById = new Map(classes.map((klass) => [klass.id, klass.name]));
  const active = sessions.filter((session) => session.status !== "cancelled");
  const upcomingSessions: UpcomingSession[] = active
    .filter((session) => session.endAt.toDate() >= now)
    .map((session) => ({
      id: session.id,
      className: classNameById.get(session.classId) ?? "Lớp",
      title: session.title,
      location: session.location,
      startAt: session.startAt.toDate(),
    }));

  const attendanceLists = await Promise.all(active.map((session) => listAttendanceBySession(session.id)));
  const absentToday = attendanceLists
    .flat()
    .filter((entry) => entry.status === "absent" || entry.status === "late").length;

  return {
    today: { total: active.length, done: active.length - upcomingSessions.length, upcoming: upcomingSessions.length },
    absentToday,
    ungraded: summaries.reduce((sum, item) => sum + Math.max(0, item.submittedCount - item.gradedCount), 0),
    pendingInvoices: invoices.filter((invoice) => invoice.status === "pending").length,
    upcomingSessions,
  };
}
