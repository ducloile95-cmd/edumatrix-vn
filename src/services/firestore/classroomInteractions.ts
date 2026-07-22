import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { format } from "date-fns";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { sendMessenger } from "@/services/integrations/messenger";
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
  batch.set(doc(db, COLLECTIONS.SESSION_INTERACTIONS, input.sessionId), input.workflowStatus === "amended" ? {
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
  messenger: "sent" | "failed" | "skipped";
  detail: string;
}

/**
 * Phat hanh tong ket buoi hoc: 1 batch nguyen tu (interaction -> published, announcement tung hoc sinh,
 * session -> completed), sau do gui Messenger tuan tu va tra ket qua tung hoc sinh.
 */
export async function publishClassroomInteraction(input: PublishClassroomInput): Promise<PublishStudentResult[]> {
  const blockers = classroomPublishBlockers(input);
  if (blockers.length) throw new Error(`CLASSROOM_PUBLISH_INCOMPLETE: ${blockers.join(" ")}`);

  const entryByStudent = new Map(input.entries.map((entry) => [entry.studentId, entry]));
  const messages = input.students.map((student) => ({
    student,
    message: formatSessionSummaryMessage({
      studentName: student.fullName,
      className: input.className,
      sessionStartAt: input.sessionStartAt,
      entry: entryByStudent.get(student.id),
      taughtContent: input.taughtContent,
      quickSummary: input.quickSummary,
      homeworkText: input.homeworkText,
      isRepublish: input.isRepublish,
    }),
  }));

  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.SESSION_INTERACTIONS, input.sessionId), {
    workflowStatus: "published",
    version: increment(1),
    updatedAt: serverTimestamp(),
  });
  messages.forEach(({ student, message }) => {
    batch.set(doc(db, COLLECTIONS.ANNOUNCEMENTS, `${input.sessionId}_${student.id}`), {
      type: "session_summary",
      sessionId: input.sessionId,
      classId: input.classId,
      studentId: student.id,
      title: input.isRepublish ? "Tổng kết buổi học (bản cập nhật)" : "Tổng kết buổi học",
      message,
      createdAt: serverTimestamp(),
    });
  });
  batch.update(doc(db, COLLECTIONS.SESSIONS, input.sessionId), {
    status: "completed",
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  const results: PublishStudentResult[] = [];
  for (const { student, message } of messages) {
    const result = await sendMessenger({ studentId: student.id, text: message, type: "session_summary" });
    results.push({
      studentId: student.id,
      studentName: student.fullName,
      message,
      messenger: result.sent ? (result.status === "sent" ? "sent" : "failed") : (result.reason === "not_configured" ? "skipped" : "failed"),
      detail: result.sent ? "" : result.message,
    });
  }
  return results;
}

/** Mo lai buoi hoc da phat hanh de dinh chinh: chi doi workflowStatus published -> amended. */
export async function reopenClassroomInteraction(sessionId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SESSION_INTERACTIONS, sessionId), {
    workflowStatus: "amended",
    updatedAt: serverTimestamp(),
  });
}
