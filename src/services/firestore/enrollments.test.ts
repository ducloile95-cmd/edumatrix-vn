import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  arrayRemove: vi.fn((value) => ({ operation: "remove", value })),
  arrayUnion: vi.fn((value) => ({ operation: "union", value })),
  doc: vi.fn((_db, collection: string, id: string) => `${collection}/${id}`),
  runTransaction: mocks.runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { enrollStudent, syncStudentEnrollments } from "@/services/firestore/enrollments";

describe("syncStudentEnrollments", () => {
  let studentCurrentClassIds: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    studentCurrentClassIds = ["class-old"];
    mocks.runTransaction.mockImplementation(async (_db, callback) => callback({
      get: mocks.transactionGet,
      set: mocks.transactionSet,
      update: mocks.transactionUpdate,
    }));
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      const records: Record<string, unknown> = {
        "students/student-1": { currentClassIds: studentCurrentClassIds, teacherIds: ["teacher-old"], status: "active" },
        "classes/class-old": { courseId: "course-old", teacherIds: ["teacher-old"], status: "active" },
        "classes/class-new": { courseId: "course-new", teacherIds: ["teacher-new"], status: "active" },
      };
      const data = records[ref];
      return {
        id: ref.split("/")[1],
        exists: () => data !== undefined,
        data: () => data,
      };
    });
  });

  test("atomically replaces classes and derives the student's teachers", async () => {
    await syncStudentEnrollments("student-1", ["class-new"], "admin-1");

    expect(mocks.transactionUpdate).toHaveBeenCalledWith("classes/class-old", expect.objectContaining({
      studentIds: { operation: "remove", value: "student-1" },
    }));
    expect(mocks.transactionUpdate).toHaveBeenCalledWith("classes/class-new", expect.objectContaining({
      studentIds: { operation: "union", value: "student-1" },
    }));
    expect(mocks.transactionSet).toHaveBeenCalledWith("enrollments/class-new_student-1", expect.objectContaining({
      classId: "class-new",
      courseId: "course-new",
      status: "active",
    }));
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      "messenger_delivery_events/enrollment_completed:class-new_student-1:v1",
      expect.objectContaining({ eventType: "enrollment_completed", actorUid: "admin-1", status: "pending" }),
    );
    expect(mocks.transactionUpdate).toHaveBeenCalledWith("students/student-1", {
      currentClassIds: ["class-new"],
      teacherIds: ["teacher-new"],
      updatedAt: "server-time",
    });
  });

  test("rejects a class id that no longer exists before writing", async () => {
    await expect(syncStudentEnrollments("student-1", ["class-missing"], "admin-1"))
      .rejects.toThrow("class_not_found");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });

  test("removes stale current class ids while applying a valid class change", async () => {
    studentCurrentClassIds = ["class-old", "class-deleted"];

    await syncStudentEnrollments("student-1", ["class-new", "class-deleted"], "admin-1");

    expect(mocks.transactionUpdate).toHaveBeenCalledWith("students/student-1", {
      currentClassIds: ["class-new"],
      teacherIds: ["teacher-new"],
      updatedAt: "server-time",
    });
  });

  test("reactivates an enrollment without replacing its original joinedAt", async () => {
    const joinedAt = { seconds: 123 };
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      const records: Record<string, unknown> = {
        "students/student-1": { currentClassIds: [], teacherIds: [], status: "active" },
        "classes/class-new": { courseId: "course-new", teacherIds: ["teacher-new"], status: "active" },
        "enrollments/class-new_student-1": { status: "ended", joinedAt },
      };
      const data = records[ref];
      return { exists: () => data !== undefined, data: () => data };
    });

    await enrollStudent("class-new", "student-1", "admin-1");

    expect(mocks.transactionSet).toHaveBeenCalledWith(
      "enrollments/class-new_student-1",
      expect.objectContaining({ joinedAt, status: "active", endedAt: null }),
    );
  });

  test("does not emit another confirmation for an enrollment that is already active", async () => {
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      const records: Record<string, unknown> = {
        "students/student-1": { currentClassIds: ["class-new"], teacherIds: ["teacher-new"], status: "active" },
        "classes/class-new": { courseId: "course-new", teacherIds: ["teacher-new"], status: "active" },
        "enrollments/class-new_student-1": { status: "active", version: 2, joinedAt: { seconds: 123 } },
      };
      const data = records[ref];
      return { exists: () => data !== undefined, data: () => data };
    });

    await enrollStudent("class-new", "student-1", "admin-1");

    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  test("does not enroll an inactive student", async () => {
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      const records: Record<string, unknown> = {
        "students/student-1": { currentClassIds: [], teacherIds: [], status: "inactive" },
        "classes/class-new": { courseId: "course-new", teacherIds: ["teacher-new"], status: "active" },
      };
      const data = records[ref];
      return { exists: () => data !== undefined, data: () => data };
    });

    await expect(enrollStudent("class-new", "student-1", "admin-1")).rejects.toThrow("student_not_active");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });
});
