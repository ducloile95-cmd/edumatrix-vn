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

import { syncStudentEnrollments } from "@/services/firestore/enrollments";

describe("syncStudentEnrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runTransaction.mockImplementation(async (_db, callback) => callback({
      get: mocks.transactionGet,
      set: mocks.transactionSet,
      update: mocks.transactionUpdate,
    }));
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      const records: Record<string, unknown> = {
        "students/student-1": { currentClassIds: ["class-old"], teacherIds: ["teacher-old"] },
        "classes/class-old": { courseId: "course-old", teacherIds: ["teacher-old"] },
        "classes/class-new": { courseId: "course-new", teacherIds: ["teacher-new"] },
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
    await syncStudentEnrollments("student-1", ["class-new"]);

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
    expect(mocks.transactionUpdate).toHaveBeenCalledWith("students/student-1", {
      currentClassIds: ["class-new"],
      teacherIds: ["teacher-new"],
      updatedAt: "server-time",
    });
  });

  test("rejects a class id that no longer exists before writing", async () => {
    await expect(syncStudentEnrollments("student-1", ["class-missing"]))
      .rejects.toThrow("class_not_found");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });
});
