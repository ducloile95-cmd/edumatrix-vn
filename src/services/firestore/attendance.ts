import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
} from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";
import { addDays, subDays } from "date-fns";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { getCurrentUserDoc, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import { listSessions } from "@/services/firestore/sessions";
import { listStudents } from "@/services/firestore/students";
import type { AttendanceDoc, AttendanceStatus, AttendanceSummaryDoc, SessionDoc } from "@/types/academic";

export interface AttendanceEntry { studentId: string; status: AttendanceStatus; note: string; }

export async function saveAttendance(sessionId: string, classId: string, entries: AttendanceEntry[], actorUid: string): Promise<void> {
  for (let offset = 0; offset < entries.length; offset += 200) {
    const batch = writeBatch(db);
    entries.slice(offset, offset + 200).forEach((entry) => {
      const attendanceId = `${sessionId}_${entry.studentId}`;
      batch.set(doc(db, COLLECTIONS.ATTENDANCE, attendanceId), { sessionId, classId, studentId: entry.studentId, status: entry.status, note: entry.note, markedBy: actorUid, markedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      if (entry.status === "absent" || entry.status === "late") batch.set(doc(db, COLLECTIONS.ANNOUNCEMENTS, `attendance_${attendanceId}`), { type: "attendance_alert", sessionId, classId, studentId: entry.studentId, title: entry.status === "absent" ? "Học sinh vắng mặt" : "Học sinh đi muộn", message: entry.note, createdAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }
  await rebuildAttendanceSummary(sessionId, classId);
}

/**
 * Dang ky nghi hoc truoc cho DUNG 1 hoc sinh (khac saveAttendance luon ghi ca roster).
 * Dung khi hoc sinh bao nghi truoc ngay hoc - khong dung cac ban cung lop.
 * Rules attendance/{id} cho phep create/update bat ky luc nao (khong kiem tra
 * buoi hoc da dien ra hay chua) nen khong can doi Rules hay collection moi -
 * xem docs/archive/KE-HOACH-TONG-QUAN-DIEM-DANH-16-07-2026.md muc 6.
 */
export async function registerLeave(
  sessionId: string,
  classId: string,
  studentId: string,
  status: Extract<AttendanceStatus, "absent" | "excused">,
  note: string,
  actorUid: string,
): Promise<void> {
  const attendanceId = `${sessionId}_${studentId}`;
  await setDoc(
    doc(db, COLLECTIONS.ATTENDANCE, attendanceId),
    { sessionId, classId, studentId, status, note, markedBy: actorUid, markedAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
  if (status === "absent") {
    await setDoc(
      doc(db, COLLECTIONS.ANNOUNCEMENTS, `attendance_${attendanceId}`),
      { type: "attendance_alert", sessionId, classId, studentId, title: "Học sinh vắng mặt", message: note, createdAt: serverTimestamp() },
      { merge: true },
    );
  }
  await rebuildAttendanceSummary(sessionId, classId);
}

async function rebuildAttendanceSummary(sessionId: string, classId: string): Promise<void> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), where("sessionId", "==", sessionId), limit(500)));
  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  snapshot.docs.forEach((item) => { const status = (item.data() as AttendanceDoc).status; counts[status] += 1; });
  await setDoc(doc(db, COLLECTIONS.ATTENDANCE_SUMMARIES, sessionId), { sessionId, classId, total: snapshot.size, ...counts, updatedAt: serverTimestamp() });
}

export async function listAttendanceBySession(sessionId: string): Promise<(AttendanceDoc & { id: string })[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), where("sessionId", "==", sessionId), limit(500)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) }));
}

/** Cac attendance doc cho nhieu session cung luc - chunk 30 (gioi han Firestore "in"), dung cho Tong quan. */
export async function listAttendanceBySessionIds(sessionIds: string[], pageSize = 500): Promise<(AttendanceDoc & { id: string })[]> {
  const uniqueIds = [...new Set(sessionIds)].filter(Boolean);
  if (uniqueIds.length === 0) return [];
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const sessionIdSet = new Set(uniqueIds);
    const classes = await listClasses();
    const snapshots = await Promise.all(classes.map((klass) => getDocs(
      query(collection(db, COLLECTIONS.ATTENDANCE), where("classId", "==", klass.id), limit(pageSize)),
    )));
    return snapshots.flatMap((snapshot) => snapshot.docs
      .map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) }))
      .filter((item) => sessionIdSet.has(item.sessionId)));
  }
  const groups: (AttendanceDoc & { id: string })[][] = [];

  for (let offset = 0; offset < uniqueIds.length; offset += 30) {
    const chunk = uniqueIds.slice(offset, offset + 30);
    let cursor: unknown = null;
    let hasMore = true;
    while (hasMore) {
      const constraints: QueryConstraint[] = [where("sessionId", "in", chunk), orderBy(documentId()), limit(pageSize)];
      if (cursor) constraints.splice(2, 0, startAfter(cursor));
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints));
      groups.push(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) })));
      hasMore = snapshot.docs.length === pageSize;
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
  }

  return groups.flat();
}

export async function listAttendanceSummariesBySessionIds(
  sessionIds: string[],
): Promise<(AttendanceSummaryDoc & { id: string })[]> {
  const uniqueIds = [...new Set(sessionIds)].filter(Boolean);
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const sessionIdSet = new Set(uniqueIds);
    const classes = await listClasses();
    const snapshots = await Promise.all(classes.map((klass) => getDocs(
      query(collection(db, COLLECTIONS.ATTENDANCE_SUMMARIES), where("classId", "==", klass.id), limit(300)),
    )));
    return snapshots.flatMap((snapshot) => snapshot.docs
      .map((item) => ({ id: item.id, ...(item.data() as AttendanceSummaryDoc) }))
      .filter((item) => sessionIdSet.has(item.sessionId)));
  }
  const groups: (AttendanceSummaryDoc & { id: string })[][] = [];

  for (let offset = 0; offset < uniqueIds.length; offset += 30) {
    const chunk = uniqueIds.slice(offset, offset + 30);
    if (chunk.length === 0) continue;
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.ATTENDANCE_SUMMARIES), where(documentId(), "in", chunk)),
    );
    groups.push(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AttendanceSummaryDoc) })));
  }

  return groups.flat();
}

export async function listAttendanceByStudents(studentIds: string[], pageSize = 500): Promise<(AttendanceDoc & { id: string })[]> {
  const uniqueIds = [...new Set(studentIds)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const studentSet = new Set(uniqueIds);
    const classes = await listClasses();
    const groups = await Promise.all(
      classes.map(async (klass) => {
        const snapshot = await getDocs(
          query(collection(db, COLLECTIONS.ATTENDANCE), where("classId", "==", klass.id), limit(pageSize)),
        );
        return snapshot.docs
          .map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) }))
          .filter((item) => studentSet.has(item.studentId));
      }),
    );
    return groups.flat().sort((a, b) => b.markedAt.toMillis() - a.markedAt.toMillis());
  }

  const chunks = uniqueIds.reduce<string[][]>((acc, studentId, index) => {
    if (index % 30 === 0) acc.push([]);
    acc[acc.length - 1].push(studentId);
    return acc;
  }, []);

  const groups = await Promise.all(chunks.map(async (chunk) => {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), where("studentId", "in", chunk), limit(pageSize)));
    return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) }));
  }));
  return groups.flat().sort((a, b) => b.markedAt.toMillis() - a.markedAt.toMillis());
}

/**
 * Buoi da ket thuc trong N ngay qua nhung chua diem danh DAY DU ca lop (so
 * sanh attendance_summaries.total voi si so lop, khong chi kiem tra "co
 * summary hay chua" - vi dang ky nghi truoc cho 1 hoc sinh cung tao summary
 * voi total=1). Lop chua co hoc sinh (si so 0) khong tinh la thieu.
 */
export async function listSessionsWithoutAttendance(days = 14): Promise<(SessionDoc & { id: string })[]> {
  const now = new Date();
  const sessions = await listSessions(subDays(now, days), now);
  const pastSessions = sessions.filter((session) => session.status !== "cancelled" && session.endAt.toMillis() < now.getTime());
  if (pastSessions.length === 0) return [];

  const classes = await listClasses();
  const rosterSizeByClass = new Map(classes.map((klass) => [klass.id, klass.studentIds.length]));

  const summaries = await listAttendanceSummariesBySessionIds(pastSessions.map((session) => session.id));
  const summaryBySessionId = new Map(summaries.map((summary) => [summary.sessionId, summary]));

  return pastSessions.filter((session) => {
    const rosterSize = rosterSizeByClass.get(session.classId) ?? 0;
    if (rosterSize === 0) return false;
    const marked = summaryBySessionId.get(session.id)?.total ?? 0;
    return marked < rosterSize;
  });
}

/** Cac dang ky nghi hoc (co phep/khong phep) da luu san cho buoi hoc CHUA dien ra trong N ngay toi. */
export async function listUpcomingRegisteredLeaves(days = 14): Promise<(AttendanceDoc & { id: string })[]> {
  const now = new Date();
  const sessions = await listSessions(now, addDays(now, days));
  const futureSessions = sessions.filter((session) => session.status !== "cancelled");
  if (futureSessions.length === 0) return [];

  const entries = await listAttendanceBySessionIds(futureSessions.map((session) => session.id));
  return entries.filter((entry) => entry.status === "absent" || entry.status === "excused");
}

export interface ClassAttendanceRate { classId: string; className: string; ratePercent: number; total: number; }
export interface AtRiskStudent { studentId: string; fullName: string; className: string | null; absentCount: number; totalMarked: number; ratePercent: number; }
export interface AttendanceOverview {
  avgRatePercent: number;
  sessionsMarked: number;
  gapSessions: (SessionDoc & { id: string })[];
  upcomingLeaves: (AttendanceDoc & { id: string })[];
  perClass: ClassAttendanceRate[];
  atRiskStudents: AtRiskStudent[];
}

/** Nguong "hoc sinh nghi khong phep nhieu" - xem gia dinh #3 trong ke hoach. */
const AT_RISK_MIN_SESSIONS = 3;
const AT_RISK_MIN_RATE = 0.2;

/** Tong hop 1 lan cho tab Tong quan - cung pattern voi getStaffDashboard() (Promise.all cac query con, react-query cache phia trang). */
export async function getAttendanceOverview(days = 30): Promise<AttendanceOverview> {
  const now = new Date();
  const from = subDays(now, days);

  const [sessions, classes, students, gapSessions, upcomingLeaves] = await Promise.all([
    listSessions(from, now),
    listClasses(),
    listStudents(),
    listSessionsWithoutAttendance(14),
    listUpcomingRegisteredLeaves(14),
  ]);

  const activeSessions = sessions.filter((session) => session.status !== "cancelled");
  const sessionIds = activeSessions.map((session) => session.id);
  const classById = new Map(classes.map((klass) => [klass.id, klass]));
  const studentById = new Map(students.map((student) => [student.id, student]));

  const [summaries, attendanceDocs] = await Promise.all([
    listAttendanceSummariesBySessionIds(sessionIds),
    listAttendanceBySessionIds(sessionIds),
  ]);

  let totalCounted = 0;
  let totalPresentLike = 0;
  const perClassAgg = new Map<string, { present: number; late: number; excused: number; absent: number; total: number }>();
  summaries.forEach((summary) => {
    totalCounted += summary.total;
    totalPresentLike += summary.present + summary.late + summary.excused;
    const current = perClassAgg.get(summary.classId) ?? { present: 0, late: 0, excused: 0, absent: 0, total: 0 };
    current.present += summary.present;
    current.late += summary.late;
    current.excused += summary.excused;
    current.absent += summary.absent;
    current.total += summary.total;
    perClassAgg.set(summary.classId, current);
  });

  const perClass: ClassAttendanceRate[] = [...perClassAgg.entries()]
    .map(([classId, agg]) => ({
      classId,
      className: classById.get(classId)?.name ?? "Lớp",
      ratePercent: agg.total > 0 ? Math.round(((agg.present + agg.late + agg.excused) / agg.total) * 100) : 0,
      total: agg.total,
    }))
    .sort((a, b) => a.ratePercent - b.ratePercent);

  const perStudentAgg = new Map<string, { absent: number; total: number }>();
  attendanceDocs.forEach((entry) => {
    const current = perStudentAgg.get(entry.studentId) ?? { absent: 0, total: 0 };
    current.total += 1;
    if (entry.status === "absent") current.absent += 1;
    perStudentAgg.set(entry.studentId, current);
  });

  const atRiskStudents: AtRiskStudent[] = [...perStudentAgg.entries()]
    .map(([studentId, agg]) => ({ studentId, absentCount: agg.absent, totalMarked: agg.total, rate: agg.total > 0 ? agg.absent / agg.total : 0 }))
    .filter((item) => item.totalMarked >= AT_RISK_MIN_SESSIONS && item.rate >= AT_RISK_MIN_RATE)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)
    .map((item) => {
      const student = studentById.get(item.studentId);
      const classId = student?.currentClassIds[0];
      return {
        studentId: item.studentId,
        fullName: student?.fullName ?? "Học sinh",
        className: classId ? classById.get(classId)?.name ?? null : null,
        absentCount: item.absentCount,
        totalMarked: item.totalMarked,
        ratePercent: Math.round(item.rate * 100),
      };
    });

  return {
    avgRatePercent: totalCounted > 0 ? Math.round((totalPresentLike / totalCounted) * 100) : 0,
    sessionsMarked: summaries.length,
    gapSessions,
    upcomingLeaves,
    perClass,
    atRiskStudents,
  };
}
