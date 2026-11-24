import {
  collection,
  getCountFromServer,
  query,
  where,
  type WhereFilterOp,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";

export type DeletionTargetType = "subject" | "course" | "class" | "student" | "user";

export interface DeletionDependencyBlocker {
  key: string;
  label: string;
  count: number;
}

export interface DeletionPreflight {
  allowed: boolean;
  total: number;
  blockers: DeletionDependencyBlocker[];
}

interface DependencyProbe {
  key: string;
  label: string;
  collectionName: string;
  field: string;
  operator?: WhereFilterOp;
}

const PROBES: Record<DeletionTargetType, DependencyProbe[]> = {
  subject: [
    { key: "courses", label: "Khóa học", collectionName: COLLECTIONS.COURSES, field: "subjectIds", operator: "array-contains" },
    { key: "classes", label: "Lớp học", collectionName: COLLECTIONS.CLASSES, field: "subjectIds", operator: "array-contains" },
    { key: "billing_items", label: "Khoản thu", collectionName: COLLECTIONS.BILLING_ITEMS, field: "subjectId" },
    { key: "lesson_plans", label: "Giáo án", collectionName: COLLECTIONS.LESSON_PLANS, field: "subjectId" },
    { key: "lesson_plan_public", label: "Giáo án đã công bố", collectionName: COLLECTIONS.LESSON_PLAN_PUBLIC, field: "subjectId" },
    { key: "lesson_plan_templates", label: "Mẫu giáo án", collectionName: COLLECTIONS.LESSON_PLAN_TEMPLATES, field: "subjectId" },
    { key: "standard_lessons", label: "Bài học chuẩn", collectionName: COLLECTIONS.STANDARD_LESSONS, field: "subjectId" },
    { key: "curriculum_items", label: "Mục giáo trình", collectionName: COLLECTIONS.COURSE_CURRICULUM_ITEMS, field: "subjectId" },
    { key: "assignments", label: "Bài tập", collectionName: COLLECTIONS.ASSIGNMENTS, field: "subjectId" },
    { key: "scores", label: "Điểm số", collectionName: COLLECTIONS.SCORES, field: "subjectId" },
    { key: "invoices", label: "Hóa đơn", collectionName: COLLECTIONS.INVOICES, field: "subjectId" },
  ],
  course: [
    { key: "classes", label: "Lớp học", collectionName: COLLECTIONS.CLASSES, field: "courseId" },
    { key: "enrollments", label: "Ghi danh", collectionName: COLLECTIONS.ENROLLMENTS, field: "courseId" },
    { key: "billing_items", label: "Khoản thu", collectionName: COLLECTIONS.BILLING_ITEMS, field: "courseId" },
    { key: "curricula", label: "Giáo trình", collectionName: COLLECTIONS.COURSE_CURRICULA, field: "courseId" },
    { key: "curriculum_items", label: "Mục giáo trình", collectionName: COLLECTIONS.COURSE_CURRICULUM_ITEMS, field: "courseId" },
    { key: "lesson_plans", label: "Giáo án", collectionName: COLLECTIONS.LESSON_PLANS, field: "courseId" },
    { key: "lesson_plan_public", label: "Giáo án đã công bố", collectionName: COLLECTIONS.LESSON_PLAN_PUBLIC, field: "courseId" },
    { key: "session_interactions", label: "Tương tác buổi học", collectionName: COLLECTIONS.SESSION_INTERACTIONS, field: "courseId" },
    { key: "invoices", label: "Hóa đơn", collectionName: COLLECTIONS.INVOICES, field: "courseId" },
  ],
  class: [
    { key: "students", label: "Học sinh", collectionName: COLLECTIONS.STUDENTS, field: "currentClassIds", operator: "array-contains" },
    { key: "enrollments", label: "Ghi danh", collectionName: COLLECTIONS.ENROLLMENTS, field: "classId" },
    { key: "sessions", label: "Buổi học", collectionName: COLLECTIONS.SESSIONS, field: "classId" },
    { key: "lesson_plans", label: "Giáo án", collectionName: COLLECTIONS.LESSON_PLANS, field: "classId" },
    { key: "lesson_plan_public", label: "Giáo án đã công bố", collectionName: COLLECTIONS.LESSON_PLAN_PUBLIC, field: "classId" },
    { key: "session_interactions", label: "Tương tác buổi học", collectionName: COLLECTIONS.SESSION_INTERACTIONS, field: "classId" },
    { key: "student_reviews", label: "Nhận xét học sinh", collectionName: COLLECTIONS.SESSION_STUDENT_REVIEWS, field: "classId" },
    { key: "attendance", label: "Điểm danh", collectionName: COLLECTIONS.ATTENDANCE, field: "classId" },
    { key: "attendance_summaries", label: "Tổng hợp điểm danh", collectionName: COLLECTIONS.ATTENDANCE_SUMMARIES, field: "classId" },
    { key: "assignments", label: "Bài tập", collectionName: COLLECTIONS.ASSIGNMENTS, field: "classId" },
    { key: "submissions", label: "Bài nộp", collectionName: COLLECTIONS.SUBMISSIONS, field: "classId" },
    { key: "scores", label: "Điểm số", collectionName: COLLECTIONS.SCORES, field: "classId" },
    { key: "invoices", label: "Hóa đơn", collectionName: COLLECTIONS.INVOICES, field: "classId" },
    { key: "announcements", label: "Thông báo", collectionName: COLLECTIONS.ANNOUNCEMENTS, field: "classId" },
    { key: "chat_threads", label: "Hội thoại", collectionName: COLLECTIONS.CHAT_THREADS, field: "classId" },
  ],
  student: [
    { key: "users", label: "Tài khoản phụ huynh", collectionName: COLLECTIONS.USERS, field: "studentIds", operator: "array-contains" },
    { key: "classes", label: "Lớp học", collectionName: COLLECTIONS.CLASSES, field: "studentIds", operator: "array-contains" },
    { key: "enrollments", label: "Ghi danh", collectionName: COLLECTIONS.ENROLLMENTS, field: "studentId" },
    { key: "attendance", label: "Điểm danh", collectionName: COLLECTIONS.ATTENDANCE, field: "studentId" },
    { key: "student_reviews", label: "Nhận xét buổi học", collectionName: COLLECTIONS.SESSION_STUDENT_REVIEWS, field: "studentId" },
    { key: "submissions", label: "Bài nộp", collectionName: COLLECTIONS.SUBMISSIONS, field: "studentId" },
    { key: "scores", label: "Điểm số", collectionName: COLLECTIONS.SCORES, field: "studentId" },
    { key: "student_summaries", label: "Tổng hợp điểm", collectionName: COLLECTIONS.STUDENT_SUMMARIES, field: "studentId" },
    { key: "invoices", label: "Hóa đơn", collectionName: COLLECTIONS.INVOICES, field: "studentId" },
    { key: "payments", label: "Thanh toán", collectionName: COLLECTIONS.PAYMENTS, field: "studentId" },
    { key: "announcements", label: "Thông báo", collectionName: COLLECTIONS.ANNOUNCEMENTS, field: "studentId" },
    { key: "delivery_events", label: "Sự kiện gửi tin", collectionName: COLLECTIONS.MESSENGER_DELIVERY_EVENTS, field: "studentId" },
    { key: "chat_threads", label: "Hội thoại", collectionName: COLLECTIONS.CHAT_THREADS, field: "studentId" },
  ],
  user: [
    { key: "parent_students", label: "Học sinh liên kết phụ huynh", collectionName: COLLECTIONS.STUDENTS, field: "parentUids", operator: "array-contains" },
    { key: "teacher_students", label: "Học sinh được phân công", collectionName: COLLECTIONS.STUDENTS, field: "teacherIds", operator: "array-contains" },
    { key: "courses", label: "Khóa học được phân công", collectionName: COLLECTIONS.COURSES, field: "teacherIds", operator: "array-contains" },
    { key: "classes", label: "Lớp học được phân công", collectionName: COLLECTIONS.CLASSES, field: "teacherIds", operator: "array-contains" },
    { key: "parent_chats", label: "Hội thoại phụ huynh", collectionName: COLLECTIONS.CHAT_THREADS, field: "parentUid" },
    { key: "assigned_chats", label: "Hội thoại được phân công", collectionName: COLLECTIONS.CHAT_THREADS, field: "assignedTeacherIds", operator: "array-contains" },
  ],
};

async function countProbe(probe: DependencyProbe, targetId: string): Promise<DeletionDependencyBlocker | null> {
  const snapshot = await getCountFromServer(query(
    collection(db, probe.collectionName),
    where(probe.field, probe.operator ?? "==", targetId),
  ));
  const count = snapshot.data().count;
  return count > 0 ? { key: probe.key, label: probe.label, count } : null;
}

export async function inspectDeletionDependencies(
  targetType: DeletionTargetType,
  targetId: string,
): Promise<DeletionPreflight> {
  const results = await Promise.all(PROBES[targetType].map((probe) => countProbe(probe, targetId)));
  const blockers = results.filter((item): item is DeletionDependencyBlocker => item !== null);
  const total = blockers.reduce((sum, blocker) => sum + blocker.count, 0);
  return { allowed: total === 0, total, blockers };
}

export class DeletionBlockedError extends Error {
  readonly report: DeletionPreflight;

  constructor(report: DeletionPreflight) {
    super("DELETION_BLOCKED");
    this.name = "DeletionBlockedError";
    this.report = report;
  }
}

export async function assertDeletionAllowed(targetType: DeletionTargetType, targetId: string): Promise<void> {
  const report = await inspectDeletionDependencies(targetType, targetId);
  if (!report.allowed) throw new DeletionBlockedError(report);
}
