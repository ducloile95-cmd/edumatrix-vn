import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  alertBatchCommit: vi.fn(),
  queueAttendanceAlertWrite: vi.fn(),
  queueAttendanceRecordWrite: vi.fn(),
  runTransaction: vi.fn(),
  sendMessenger: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id: string) => `${name}/${id}`),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  increment: vi.fn((value) => ({ increment: value })),
  limit: vi.fn(),
  query: vi.fn(),
  runTransaction: mocks.runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({ commit: mocks.alertBatchCommit })),
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/attendance", () => ({
  attendanceCounts: vi.fn(() => ({ present: 1, absent: 0, late: 0, excused: 0 })),
  queueAttendanceAlertWrite: mocks.queueAttendanceAlertWrite,
  queueAttendanceRecordWrite: mocks.queueAttendanceRecordWrite,
}));
vi.mock("@/services/integrations/messenger", () => ({ sendMessenger: mocks.sendMessenger }));

import { publishClassroomInteraction, saveClassroomDraft } from "@/services/firestore/classroomInteractions";

function snapshot(id: string, data?: Record<string, unknown>) {
  return { id, exists: () => data !== undefined, data: () => data };
}

describe("classroom live-data invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runTransaction.mockImplementation(async (_db, callback) => callback({
      get: mocks.transactionGet,
      set: mocks.transactionSet,
      update: mocks.transactionUpdate,
    }));
    mocks.sendMessenger.mockResolvedValue({ sent: true, status: "sent" });
    mocks.alertBatchCommit.mockResolvedValue(undefined);
  });

  test("rejects a draft from a stale roster before writing any document", async () => {
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      if (ref === "classes/class-1") return snapshot("class-1", {
        status: "active", courseId: "course-1", studentIds: ["student-1", "student-2"],
      });
      if (ref === "sessions/session-1") return snapshot("session-1", { classId: "class-1" });
      return snapshot("session-1");
    });

    await expect(saveClassroomDraft({
      sessionId: "session-1",
      classId: "class-1",
      courseId: "course-1",
      teacherId: "teacher-1",
      taughtContent: "Content",
      quickSummary: "Summary",
      homeworkText: "Homework",
      entries: [{
        studentId: "student-1",
        attendanceStatus: "present",
        previousHomeworkStatus: "done",
        individualComment: "Good",
      }],
      isNew: true,
    })).rejects.toThrow("CLASSROOM_ROSTER_STALE");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  test("saves a 200-student roster without putting alert writes in the transaction", async () => {
    const studentIds = Array.from({ length: 200 }, (_, index) => `student-${index + 1}`);
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      if (ref === "classes/class-1") return snapshot("class-1", {
        status: "active", courseId: "course-1", studentIds,
      });
      if (ref === "sessions/session-1") return snapshot("session-1", { classId: "class-1" });
      return snapshot("session-1");
    });

    await expect(saveClassroomDraft({
      sessionId: "session-1",
      classId: "class-1",
      courseId: "course-1",
      teacherId: "teacher-1",
      taughtContent: "Content",
      quickSummary: "Summary",
      homeworkText: "Homework",
      entries: studentIds.map((studentId) => ({
        studentId,
        attendanceStatus: "present" as const,
        previousHomeworkStatus: "done" as const,
        individualComment: "Good",
      })),
      isNew: true,
    })).resolves.toBeUndefined();
    expect(mocks.queueAttendanceRecordWrite).toHaveBeenCalledTimes(200);
    expect(mocks.queueAttendanceAlertWrite).toHaveBeenCalledTimes(200);
    expect(mocks.alertBatchCommit).toHaveBeenCalledTimes(1);
  });

  test("publishes every live class student from persisted reviews, not stale UI data", async () => {
    const records: Record<string, Record<string, unknown>> = {
      "classes/class-1": { name: "Live class", studentIds: ["student-1", "student-2"] },
      "sessions/session-1": { classId: "class-1", startAt: { toDate: () => new Date("2026-08-09T10:00:00Z") } },
      "session_interactions/session-1": {
        classId: "class-1", teacherId: "teacher-1", workflowStatus: "draft", version: 1, taughtContent: "Live content",
        quickSummary: "Live summary", homeworkText: "Live homework",
      },
      "students/student-1": { fullName: "Student One" },
      "students/student-2": { fullName: "Student Two" },
      "session_student_reviews/session-1_student-1": {
        studentId: "student-1", attendanceStatus: "present", previousHomeworkStatus: "done", individualComment: "Good",
      },
      "session_student_reviews/session-1_student-2": {
        studentId: "student-2", attendanceStatus: "present", previousHomeworkStatus: "done", individualComment: "Good",
      },
    };
    mocks.transactionGet.mockImplementation(async (ref: string) => snapshot(ref.split("/")[1], records[ref]));

    const result = await publishClassroomInteraction({
      actorUid: "teacher-1",
      sessionId: "session-1",
      classId: "class-1",
      className: "Stale class",
      sessionStartAt: new Date(0),
      taughtContent: "Stale content",
      quickSummary: "Stale summary",
      homeworkText: "Stale homework",
      students: [{ id: "student-1", fullName: "Stale name" }],
      entries: [],
      isRepublish: false,
    });

    expect(result.map((item) => item.studentId)).toEqual(["student-1", "student-2"]);
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      "announcements/session-1_student-2",
      expect.objectContaining({ studentId: "student-2", message: expect.stringContaining("Live content") }),
    );
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      "messenger_delivery_events/lesson_feedback_published:session-1_student-2:v2",
      expect.objectContaining({ eventType: "lesson_feedback_published", status: "pending", actorUid: "teacher-1" }),
    );
    expect(mocks.transactionUpdate).toHaveBeenCalledWith(
      "session_interactions/session-1",
      expect.objectContaining({ workflowStatus: "published" }),
    );
    expect(result.every((item) => item.messenger === "pending")).toBe(true);
  });
});
