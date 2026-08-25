import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { format } from "date-fns";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { attendanceCounts, queueAttendanceAlertWrite, queueAttendanceRecordWrite } from "@/services/firestore/attendance";
import { queueUtilityDeliveryEvent } from "@/services/firestore/messengerDelivery";
import type {
  AttendanceStatus,
  AttendanceDoc,
  ClassDoc,
  PreviousHomeworkStatus,
  SessionDoc,
  SessionInteractionDoc,
  SessionStudentReviewDoc,
  StudentDoc,
} from "@/types/academic";

export interface ClassroomStudentEntry {
  studentId: string;
  attendanceStatus: AttendanceStatus;
  previousHomeworkStatus: PreviousHomeworkStatus;
  individualComment: string;
}

export const CLASSROOM_ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Có mặt",
  late: "Muộn",
  absent: "Vắng",
  excused: "Có phép",
};

export const CLASSROOM_HOMEWORK_LABEL: Record<PreviousHomeworkStatus, string> = {
  done: "Đã làm",
  partial: "Một phần",
  not_done: "Chưa làm",
  not_assigned: "Không giao",
};

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
  /** "amended" = dang dinh chinh sau phat hanh: chi ghi noi dung, giu nguyen workflowStatus/version. */
  workflowStatus?: "draft" | "amended";
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
    limit(MAX_CLASSROOM_STUDENTS),
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
    limit(MAX_CLASSROOM_STUDENTS),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AttendanceDoc) }));
}

export async function saveClassroomDraft(input: SaveClassroomDraftInput): Promise<void> {
  if (input.entries.length > MAX_CLASSROOM_STUDENTS) throw new Error("CLASSROOM_ROSTER_TOO_LARGE");
  await runTransaction(db, async (transaction) => {
    const classRef = doc(db, COLLECTIONS.CLASSES, input.classId);
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, input.sessionId);
    const interactionRef = doc(db, COLLECTIONS.SESSION_INTERACTIONS, input.sessionId);
    const [classSnap, sessionSnap, interactionSnap] = await Promise.all([
      transaction.get(classRef),
      transaction.get(sessionRef),
      transaction.get(interactionRef),
    ]);
    if (!classSnap.exists()) throw new Error("CLASS_NOT_FOUND");
    if (!sessionSnap.exists()) throw new Error("SESSION_NOT_FOUND");
    const klass = classSnap.data() as ClassDoc;
    const session = sessionSnap.data() as SessionDoc;
    if (klass.status !== "active") throw new Error("CLASS_NOT_ACTIVE");
    if (session.classId !== input.classId || klass.courseId !== input.courseId) throw new Error("CLASSROOM_CONTEXT_MISMATCH");
    const roster = [...new Set(klass.studentIds)].sort();
    const entryIds = [...new Set(input.entries.map((entry) => entry.studentId))].sort();
    if (entryIds.length !== input.entries.length || JSON.stringify(entryIds) !== JSON.stringify(roster)) {
      throw new Error("CLASSROOM_ROSTER_STALE");
    }

    transaction.set(interactionRef, input.workflowStatus === "amended" ? {
      taughtContent: input.taughtContent.trim(),
      quickSummary: input.quickSummary.trim(),
      homeworkText: input.homeworkText.trim(),
      updatedAt: serverTimestamp(),
    } : {
      sessionId: input.sessionId,
      classId: input.classId,
      courseId: input.courseId,
      teacherId: input.teacherId,
      workflowStatus: "draft",
      taughtContent: input.taughtContent.trim(),
      quickSummary: input.quickSummary.trim(),
      homeworkText: input.homeworkText.trim(),
      version: 1,
      ...(!interactionSnap.exists() ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    const counts = attendanceCounts(input.entries.map((entry) => ({
      studentId: entry.studentId,
      status: entry.attendanceStatus,
      note: entry.individualComment,
    })));
    input.entries.forEach((entry) => {
      transaction.set(doc(db, COLLECTIONS.SESSION_STUDENT_REVIEWS, `${input.sessionId}_${entry.studentId}`), {
        sessionId: input.sessionId,
        classId: input.classId,
        studentId: entry.studentId,
        attendanceStatus: entry.attendanceStatus,
        previousHomeworkStatus: entry.previousHomeworkStatus,
        individualComment: entry.individualComment.trim(),
        updatedBy: input.teacherId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      queueAttendanceRecordWrite(transaction as unknown as ReturnType<typeof writeBatch>, input.sessionId, input.classId, {
        studentId: entry.studentId,
        status: entry.attendanceStatus,
        note: entry.individualComment,
      }, input.teacherId);
    });
    transaction.set(doc(db, COLLECTIONS.ATTENDANCE_SUMMARIES, input.sessionId), {
      sessionId: input.sessionId,
      classId: input.classId,
      total: input.entries.length,
      ...counts,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  // Draft/review/attendance remain atomic (2 writes/student + 2 metadata writes).
  // Alerts use deterministic IDs in a separate idempotent batch so a 200-student
  // roster stays below Firestore's 500-write transaction limit. A retry is safe.
  const alertBatch = writeBatch(db);
  input.entries.forEach((entry) => queueAttendanceAlertWrite(alertBatch, input.sessionId, input.classId, {
    studentId: entry.studentId,
    status: entry.attendanceStatus,
    note: entry.individualComment,
  }));
  await alertBatch.commit();
}

const MAX_CLASSROOM_STUDENTS = 200;

export interface SessionSummaryContext {
  studentName: string;
  className: string;
  sessionStartAt: Date;
  entry: ClassroomStudentEntry | undefined;
  taughtContent: string;
  quickSummary: string;
  homeworkText: string;
  isRepublish: boolean;
}

/** Nguon su that duy nhat cho noi dung tong ket gui phu huynh - dung chung cho xem truoc, announcement va Messenger. */
export function formatSessionSummaryMessage(context: SessionSummaryContext): string {
  const header = context.isRepublish ? "TỔNG KẾT BUỔI HỌC (BẢN CẬP NHẬT)" : "TỔNG KẾT BUỔI HỌC";
  const attendance = context.entry ? CLASSROOM_ATTENDANCE_LABEL[context.entry.attendanceStatus] : "Chưa cập nhật";
  const homework = context.entry ? CLASSROOM_HOMEWORK_LABEL[context.entry.previousHomeworkStatus] : "Chưa cập nhật";
  return `${header}\n< Edumatrix - tin nhắn tự động >\n\nHọc sinh: ${context.studentName}\nLớp: ${context.className}\nThời gian: ${format(context.sessionStartAt, "HH:mm, dd/MM/yyyy")}\n\nChuyên cần: ${attendance}\nBài tập buổi trước: ${homework}\nNhận xét của giáo viên: ${context.entry?.individualComment || "Chưa có nhận xét cá nhân"}\n\nNội dung: ${context.taughtContent || "Chưa cập nhật"}\nTổng kết: ${context.quickSummary || "Chưa cập nhật"}\nBài tập về nhà: ${context.homeworkText || "Chưa cập nhật"}`;
}

export interface PublishClassroomInput {
  actorUid: string;
  sessionId: string;
  classId: string;
  className: string;
  sessionStartAt: Date;
  taughtContent: string;
  quickSummary: string;
  homeworkText: string;
  students: Array<{ id: string; fullName: string }>;
  entries: ClassroomStudentEntry[];
  isRepublish: boolean;
}

/** Danh sach dieu kien con thieu de phat hanh - rong nghia la du dieu kien. Dung chung cho UI (bat nut) va publish (kiem tra kep). */
export function classroomPublishBlockers(input: Pick<PublishClassroomInput, "students" | "entries" | "taughtContent" | "quickSummary" | "homeworkText">): string[] {
  const blockers: string[] = [];
  const entryByStudent = new Map(input.entries.map((entry) => [entry.studentId, entry]));
  const missingEntry = input.students.filter((student) => !entryByStudent.get(student.id));
  if (input.students.length === 0) blockers.push("Lớp chưa có học sinh.");
  if (missingEntry.length) blockers.push(`${missingEntry.length} học sinh chưa được ghi nhận chuyên cần/bài tập.`);
  if (!input.taughtContent.trim()) blockers.push("Chưa nhập nội dung đã dạy.");
  if (!input.quickSummary.trim()) blockers.push("Chưa nhập tổng kết nhanh.");
  if (!input.homeworkText.trim()) blockers.push("Chưa nhập bài tập về nhà (ghi rõ nếu không có bài tập).");
  const needComment = input.students.filter((student) => {
    const entry = entryByStudent.get(student.id);
    return entry &&
      (entry.attendanceStatus === "absent" || entry.attendanceStatus === "late" ||
        entry.previousHomeworkStatus === "not_done" || entry.previousHomeworkStatus === "partial") &&
      !entry.individualComment.trim();
  });
  if (needComment.length) blockers.push(`${needComment.length} học sinh cần chú ý chưa có nhận xét cá nhân.`);
  return blockers;
}

export interface PublishStudentResult {
  studentId: string;
  studentName: string;
  message: string;
  messenger: "pending" | "sent" | "failed" | "skipped";
  detail: string;
}

/**
 * Phat hanh tong ket buoi hoc: 1 batch nguyen tu (interaction -> published, announcement tung hoc sinh,
 * session -> completed), sau do gui Messenger tuan tu va tra ket qua tung hoc sinh.
 */
export async function publishClassroomInteraction(input: PublishClassroomInput): Promise<PublishStudentResult[]> {
  const messages = await runTransaction(db, async (transaction) => {
    const classRef = doc(db, COLLECTIONS.CLASSES, input.classId);
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, input.sessionId);
    const interactionRef = doc(db, COLLECTIONS.SESSION_INTERACTIONS, input.sessionId);
    const [classSnap, sessionSnap, interactionSnap] = await Promise.all([
      transaction.get(classRef),
      transaction.get(sessionRef),
      transaction.get(interactionRef),
    ]);
    if (!classSnap.exists()) throw new Error("CLASS_NOT_FOUND");
    if (!sessionSnap.exists()) throw new Error("SESSION_NOT_FOUND");
    if (!interactionSnap.exists()) throw new Error("CLASSROOM_DRAFT_NOT_FOUND");
    const klass = classSnap.data() as ClassDoc;
    const session = sessionSnap.data() as SessionDoc;
    const interaction = interactionSnap.data() as SessionInteractionDoc;
    if (session.classId !== input.classId || interaction.classId !== input.classId) throw new Error("CLASSROOM_CONTEXT_MISMATCH");
    if (interaction.workflowStatus !== "draft" && interaction.workflowStatus !== "amended") throw new Error("CLASSROOM_NOT_PUBLISHABLE");
    const studentIds = [...new Set(klass.studentIds)].sort();
    if (studentIds.length > MAX_CLASSROOM_STUDENTS) throw new Error("CLASSROOM_ROSTER_TOO_LARGE");
    const [studentSnaps, reviewSnaps] = await Promise.all([
      Promise.all(studentIds.map((studentId) => transaction.get(doc(db, COLLECTIONS.STUDENTS, studentId)))),
      Promise.all(studentIds.map((studentId) => transaction.get(doc(db, COLLECTIONS.SESSION_STUDENT_REVIEWS, `${input.sessionId}_${studentId}`)))),
    ]);
    if (studentSnaps.some((snap) => !snap.exists())) throw new Error("CLASSROOM_STUDENT_MISSING");
    const students = studentSnaps.map((snap) => ({ id: snap.id, fullName: (snap.data() as StudentDoc).fullName }));
    const entries = reviewSnaps.flatMap((snap) => snap.exists() ? [snap.data() as SessionStudentReviewDoc] : []);
    const blockers = classroomPublishBlockers({
      students,
      entries,
      taughtContent: interaction.taughtContent,
      quickSummary: interaction.quickSummary,
      homeworkText: interaction.homeworkText,
    });
    if (blockers.length) throw new Error(`CLASSROOM_PUBLISH_INCOMPLETE: ${blockers.join(" ")}`);
    const isRepublish = interaction.workflowStatus === "amended";
    const entryByStudent = new Map(entries.map((entry) => [entry.studentId, entry]));
    const messages = students.map((student) => ({
      student,
      message: formatSessionSummaryMessage({
        studentName: student.fullName,
        className: klass.name,
        sessionStartAt: session.startAt.toDate(),
        entry: entryByStudent.get(student.id),
        taughtContent: interaction.taughtContent,
        quickSummary: interaction.quickSummary,
        homeworkText: interaction.homeworkText,
        isRepublish,
      }),
    }));

    const nextVersion = interaction.version + 1;
    transaction.update(interactionRef, {
      workflowStatus: "published",
      version: increment(1),
      updatedAt: serverTimestamp(),
    });
    messages.forEach(({ student, message }) => {
      transaction.set(doc(db, COLLECTIONS.ANNOUNCEMENTS, `${input.sessionId}_${student.id}`), {
      type: "session_summary",
      sessionId: input.sessionId,
      classId: input.classId,
      studentId: student.id,
      title: input.isRepublish ? "Tổng kết buổi học (bản cập nhật)" : "Tổng kết buổi học",
      message,
      createdAt: serverTimestamp(),
      });
      queueUtilityDeliveryEvent(transaction, {
        eventType: "lesson_feedback_published",
        entityId: `${input.sessionId}_${student.id}`,
        sourceId: input.sessionId,
        studentId: student.id,
        version: nextVersion,
        actorUid: input.actorUid,
      });
    });
    transaction.update(sessionRef, {
      status: "completed",
      updatedAt: serverTimestamp(),
    });
    return messages;
  });

  return messages.map(({ student, message }) => ({
    studentId: student.id,
    studentName: student.fullName,
    message,
    messenger: "pending" as const,
    detail: "Đang chờ Worker gửi mẫu Utility.",
  }));
}

/** Mo lai buoi hoc da phat hanh de dinh chinh: chi doi workflowStatus published -> amended. */
export async function reopenClassroomInteraction(sessionId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SESSION_INTERACTIONS, sessionId), {
    workflowStatus: "amended",
    updatedAt: serverTimestamp(),
  });
}
