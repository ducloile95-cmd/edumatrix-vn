import type { Timestamp } from "firebase/firestore";

/** subjects/{subjectId} - ID = ma mon hoc chuan hoa (A13, Section 10.2). */
export type SubjectStatus = "active" | "archived";

export interface SubjectDoc {
  name: string;
  code: string;
  description: string;
  status: SubjectStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** courses/{courseId} - ID auto, khong co ma nghiep vu rieng (A13, Section 10.3). */
export type CourseStatus = "draft" | "active" | "completed";

export interface CourseDoc {
  name: string;
  subjectIds: string[];
  /** Don gia 1 buoi/1 hoc sinh - so nguyen VND, khong dung float (A7.4). Truong nguon chinh cho hoc phi. */
  pricePerSession: number;
  /** Tong hoc phi du kien = pricePerSession * totalSessions - tu tinh khi luu, khong nhap tay. */
  tuitionFee: number;
  totalSessions: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: CourseStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** classes/{classId} - ID auto (A13, Section 10.4). */
export type ClassStatus = "active" | "completed" | "cancelled";

/** Lich lap theo tuan dung de sinh buoi hoc tu dong. Chi co khi lop duoc tao bang "Lich hoc thong minh". */
export interface ClassRecurrence {
  /** 0=CN..6=T7, cung quy uoc voi DOW_LABEL trong TimetableGrid/MonthGrid. */
  daysOfWeek: number[];
  /** "HH:mm" 24h. */
  startTime: string;
  /** "HH:mm" 24h. */
  endTime: string;
  /** Ngay khai giang. */
  startDate: Timestamp;
  /** Ngay be giang - tu tinh tu buoi cuoi cung. */
  endDate: Timestamp;
  sessionCount: number;
}

export interface ClassDoc {
  name: string;
  courseId: string;
  subjectIds: string[];
  teacherIds: string[];
  studentIds: string[];
  scheduleText: string;
  location: string;
  status: ClassStatus;
  /** Lop cu/lop tao thu cong = undefined. */
  recurrence?: ClassRecurrence | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** students/{studentId} - ID = ma hoc sinh chuan hoa (A13, Section 10.1). */
export type StudentStatus = "active" | "inactive";

export interface StudentDoc {
  studentCode: string;
  fullName: string;
  /** "YYYY-MM-DD" - khong can timezone (A7.5). */
  dateOfBirth: string;
  parentUids: string[];
  currentClassIds: string[];
  teacherIds: string[];
  /** Ghi chu noi bo cua Admin/Giao vien ve hoc sinh. */
  staffNote?: string;
  status: StudentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** enrollments/{classId_studentId} - ID xac dinh chong ghi trung (A13, Section 10.5). */
export type EnrollmentStatus = "active" | "ended";

export interface EnrollmentDoc {
  classId: string;
  courseId: string;
  studentId: string;
  status: EnrollmentStatus;
  joinedAt: Timestamp;
  endedAt: Timestamp | null;
}

export type SessionStatus = "scheduled" | "rescheduled" | "cancelled" | "completed";

export interface SessionDoc {
  classId: string;
  title: string;
  startAt: Timestamp;
  endAt: Timestamp;
  location: string;
  status: SessionStatus;
  note: string;
  makeUpForSessionId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type LessonPlanStatus = "draft" | "published" | "archived";
/** Kieu section tu do cu - chi con dung de doc/chuan hoa giao an cu, khong dung khi tao moi (A: xem normalizeLessonPlan). */
export interface LessonPlanSection { title: string; content: string; }
export interface LessonPlanObjectives { knowledge: string; skills: string; attitude: string; }
export interface LessonPlanPreparation { teacher: string; student: string; }
export interface LessonPlanActivity { name: string; durationMinutes: number; content: string; expectedOutcome: string; }
export interface LessonPlanDoc {
  title: string;
  classId: string | null;
  courseId: string | null;
  subjectId: string | null;
  sessionId: string | null;
  objectives: LessonPlanObjectives;
  preparation: LessonPlanPreparation;
  activities: LessonPlanActivity[];
  homework: string;
  notesAfterTeaching: string;
  /** Link tai lieu dinh kem (Drive/OneDrive da chia se) - KHONG dung Firebase Storage (A: Spark plan da bo Storage tu 03/02/2026). */
  attachmentUrl: string | null;
  attachmentLabel: string;
  publicSummary: string;
  status: LessonPlanStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LessonPlanTemplateDoc {
  name: string;
  objectives: LessonPlanObjectives;
  preparation: LessonPlanPreparation;
  activities: LessonPlanActivity[];
  homework: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export interface AttendanceDoc {
  sessionId: string;
  classId: string;
  studentId: string;
  status: AttendanceStatus;
  note: string;
  markedBy: string;
  markedAt: Timestamp;
  updatedAt: Timestamp;
}
export interface AttendanceSummaryDoc {
  sessionId: string;
  classId: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  updatedAt: Timestamp;
}

export type AssignmentStatus = "draft" | "published" | "closed";
export type SubmissionStatus = "submitted" | "reviewing" | "graded" | "redo_required";
export interface AssignmentDoc { title: string; description: string; classId: string; subjectId?: string; lessonPlanId: string | null; sessionId: string | null; dueAt: Timestamp; submissionType: "link" | "text"; maxScore: number; status: AssignmentStatus; createdBy: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface SubmissionDoc { assignmentId: string; studentId: string; classId: string; submissionUrl: string; submissionText: string; studentNote: string; status: SubmissionStatus; score: number | null; teacherComment: string; checkedBy: string | null; submittedAt: Timestamp; checkedAt: Timestamp | null; updatedAt: Timestamp; }
export interface AssignmentSummaryDoc { assignmentId: string; totalStudents: number; submittedCount: number; gradedCount: number; redoCount: number; updatedAt: Timestamp; }
export type AssessmentType = "quiz" | "midterm" | "final" | "assignment";
export type ScoreSource = "manual" | "assignment";
export interface ScoreDoc { studentId: string; classId: string; subjectId: string; assessmentName: string; assessmentType: AssessmentType; score: number; maxScore: number; teacherComment: string; source?: ScoreSource; assignmentId?: string | null; submissionId?: string | null; published?: boolean; createdBy: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface StudentSummaryDoc { studentId: string; scoreCount: number; averagePercent: number; latestScore: number; latestMaxScore: number; updatedAt: Timestamp; }
export type InvoiceStatus = "unpaid" | "pending" | "paid" | "overdue" | "rejected";
export interface InvoiceDoc { invoiceCode:string;studentId:string;courseId:string|null;title:string;amount:number;dueAt:Timestamp;paymentContent:string;bankBin:string;accountNumber:string;accountName:string;status:InvoiceStatus;createdBy:string;createdAt:Timestamp;updatedAt:Timestamp; }
export type PaymentStatus = "reported" | "verified" | "rejected";
export interface PaymentDoc { invoiceId:string;studentId:string;amount:number;transactionReference:string;note:string;status:PaymentStatus;reportedBy:string;verifiedBy:string|null;reportedAt:Timestamp;verifiedAt:Timestamp|null;updatedAt:Timestamp; }
