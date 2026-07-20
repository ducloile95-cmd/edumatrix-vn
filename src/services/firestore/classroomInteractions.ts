import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import type {
  AttendanceStatus,
  AttendanceDoc,
  PreviousHomeworkStatus,
  SessionInteractionDoc,
  SessionStudentReviewDoc,
} from "@/types/academic";

export interface ClassroomStudentEntry {
  studentId: string;
  attendanceStatus: AttendanceStatus;
  previousHomeworkStatus: PreviousHomeworkStatus;
  individualComment: string;
}

export interface SaveClassroomDraftInput {
  sessionId: string;
  classId: string;
  courseId: string;
  teacherId: string;
  taughtContent: string;
  quickSummary: string;
  homeworkText: string;
  entries: ClassroomStudentEntry[];
  isNew: boolean;
}

export async function getSessionInteraction(sessionId: string): Promise<(SessionInteractionDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.SESSION_INTERACTIONS, sessionId));
  return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as SessionInteractionDoc) } : null;
}

export async function getSessionStudentReviews(
  sessionId: string,
  classId: string,
): Promise<(SessionStudentReviewDoc & { id: string })[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.SESSION_STUDENT_REVIEWS),
    where("classId", "==", classId),
    where("sessionId", "==", sessionId),
    limit(150),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as SessionStudentReviewDoc) }));
}

export async function getSessionAttendanceEntries(
  sessionId: string,
  classId: string,
): Promise<(AttendanceDoc & { id: string })[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where("classId", "==", classId),
    where("sessionId", "==", sessionId),
    limit(150),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) }));
}

export async function saveClassroomDraft(input: SaveClassroomDraftInput): Promise<void> {
  if (input.entries.length > 150) throw new Error("CLASSROOM_ROSTER_TOO_LARGE");

  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.SESSION_INTERACTIONS, input.sessionId), {
    sessionId: input.sessionId,
    classId: input.classId,
    courseId: input.courseId,
    teacherId: input.teacherId,
    workflowStatus: "draft",
    taughtContent: input.taughtContent.trim(),
    quickSummary: input.quickSummary.trim(),
    homeworkText: input.homeworkText.trim(),
    version: 1,
    ...(input.isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  const attendanceCounts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  input.entries.forEach((entry) => {
    attendanceCounts[entry.attendanceStatus] += 1;
    batch.set(doc(db, COLLECTIONS.SESSION_STUDENT_REVIEWS, `${input.sessionId}_${entry.studentId}`), {
      sessionId: input.sessionId,
      classId: input.classId,
      studentId: entry.studentId,
      attendanceStatus: entry.attendanceStatus,
      previousHomeworkStatus: entry.previousHomeworkStatus,
      individualComment: entry.individualComment.trim(),
      updatedBy: input.teacherId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    batch.set(doc(db, COLLECTIONS.ATTENDANCE, `${input.sessionId}_${entry.studentId}`), {
      sessionId: input.sessionId,
      classId: input.classId,
      studentId: entry.studentId,
      status: entry.attendanceStatus,
      note: entry.individualComment.trim(),
      markedBy: input.teacherId,
      markedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  batch.set(doc(db, COLLECTIONS.ATTENDANCE_SUMMARIES, input.sessionId), {
    sessionId: input.sessionId,
    classId: input.classId,
    total: input.entries.length,
    ...attendanceCounts,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}
