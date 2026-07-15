import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { getCurrentUserDoc, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import type { AttendanceDoc, AttendanceStatus, AttendanceSummaryDoc } from "@/types/academic";

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

export async function listAttendanceSummariesBySessionIds(
  sessionIds: string[],
): Promise<(AttendanceSummaryDoc & { id: string })[]> {
  const uniqueIds = [...new Set(sessionIds)].filter(Boolean);
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
