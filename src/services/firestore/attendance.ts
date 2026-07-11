import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { AttendanceDoc, AttendanceStatus } from "@/types/academic";

export interface AttendanceEntry { studentId: string; status: AttendanceStatus; note: string; }

export async function saveAttendance(sessionId: string, classId: string, entries: AttendanceEntry[], actorUid: string): Promise<void> {
  for (let offset = 0; offset < entries.length; offset += 200) {
    const batch = writeBatch(db);
    entries.slice(offset, offset + 200).forEach((entry) => {
      const attendanceId = `${sessionId}_${entry.studentId}`;
      batch.set(doc(db, COLLECTIONS.ATTENDANCE, attendanceId), { sessionId, classId, studentId: entry.studentId, status: entry.status, note: entry.note, markedBy: actorUid, markedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      if (entry.status === "absent" || entry.status === "late") batch.set(doc(db, COLLECTIONS.ANNOUNCEMENTS, `attendance_${attendanceId}`), { type: "attendance_alert", sessionId, classId, studentId: entry.studentId, title: entry.status === "absent" ? "Hoc sinh vang mat" : "Hoc sinh di muon", message: entry.note, createdAt: serverTimestamp() }, { merge: true });
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

export async function listAttendanceByStudents(studentIds: string[]): Promise<(AttendanceDoc & { id: string })[]> {
  const groups = await Promise.all(studentIds.map(async (studentId) => {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), where("studentId", "==", studentId), limit(500)));
    return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) }));
  }));
  return groups.flat().sort((a, b) => b.markedAt.toMillis() - a.markedAt.toMillis());
}
