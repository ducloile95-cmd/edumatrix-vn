import { beforeEach, describe, expect, test, vi } from "vitest";

const { getCurrentUserDoc, isAdminUser, runTransaction, transactionGet, transactionUpdate } = vi.hoisted(() => ({
  getCurrentUserDoc: vi.fn(),
  isAdminUser: vi.fn(),
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionUpdate: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: vi.fn((value) => value) },
  addDoc: vi.fn(),
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id?: string) => id ? `${name}/${id}` : `${name}/new`),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({
  getCurrentUserDoc,
  isAdminUser,
  isTeacherUser: vi.fn(),
}));

import { updateClass } from "@/services/firestore/classes";

const input = {
  name: "Class 1",
  courseId: "course-1",
  subjectIds: ["subject-1"],
  teacherIds: ["teacher-new"],
  scheduleText: "T2",
  location: "Room 1",
  status: "active" as const,
};

describe("updateClass teacher assignment", () => {
  beforeEach(() => {
    getCurrentUserDoc.mockReset().mockResolvedValue({ role: "admin" });
    isAdminUser.mockReset().mockImplementation((user) => user?.role === "admin");
    transactionGet.mockReset();
    transactionUpdate.mockReset();
    runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: transactionGet,
      update: transactionUpdate,
    }));
  });

  test("recomputes each student's teachers from all current classes", async () => {
    transactionGet.mockImplementation(async (ref: string) => {
      if (ref === "classes/class-1") return {
        exists: () => true,
        data: () => ({ teacherIds: ["teacher-old"], studentIds: ["student-1"] }),
      };
      if (ref === "students/student-1") return {
        exists: () => true,
        ref,
        data: () => ({ currentClassIds: ["class-1", "class-2"], teacherIds: ["teacher-old"] }),
      };
      if (ref === "classes/class-2") return {
        id: "class-2",
        exists: () => true,
        data: () => ({ teacherIds: ["teacher-other"] }),
      };
      throw new Error(`Unexpected ref: ${ref}`);
    });

    await updateClass("class-1", input);

    expect(transactionUpdate).toHaveBeenCalledWith("classes/class-1", expect.objectContaining({
      teacherIds: ["teacher-new"],
    }));
    expect(transactionUpdate).toHaveBeenCalledWith("students/student-1", {
      teacherIds: ["teacher-new", "teacher-other"],
      updatedAt: "server-time",
    });
  });

  test("does not rewrite students when a teacher edits without changing assignment", async () => {
    getCurrentUserDoc.mockResolvedValue({ role: "teacher" });
    transactionGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ teacherIds: ["teacher-new"], studentIds: ["student-1"] }),
    });

    await updateClass("class-1", input);

    expect(transactionGet).toHaveBeenCalledTimes(1);
    expect(transactionUpdate).toHaveBeenCalledTimes(1);
  });
});
