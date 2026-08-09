import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchCommit, batchSet, getCurrentUserDoc, getDocs, isAdminUser, isTeacherUser, listClasses, runTransaction, transactionGet, transactionSet, transactionUpdate, where, writeBatch } = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  getCurrentUserDoc: vi.fn(),
  getDocs: vi.fn(),
  isAdminUser: vi.fn(),
  isTeacherUser: vi.fn(),
  listClasses: vi.fn(),
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
  where: vi.fn((...values) => ({ where: values })),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((...args: unknown[]) => args.length === 1
    ? { id: "assignment-1", path: "assignments/assignment-1" }
    : `${args[1]}/${args[2]}`),
  documentId: vi.fn(() => "document-id"),
  getDocs,
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn(),
  startAfter: vi.fn((value) => ({ startAfter: value })),
  where,
  writeBatch,
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc, isAdminUser, isTeacherUser }));
vi.mock("@/services/firestore/classes", () => ({ listClasses }));

import { createAssignment, gradeSubmission, listAssignments, listSubmissions, listSubmissionsByStudents } from "@/services/firestore/assignments";

describe("createAssignment", () => {
  beforeEach(() => {
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchSet.mockReset();
    getCurrentUserDoc.mockReset();
    getDocs.mockReset();
    isAdminUser.mockReset();
    isTeacherUser.mockReset();
    listClasses.mockReset();
    where.mockClear();
    writeBatch.mockReset().mockReturnValue({ set: batchSet, commit: batchCommit });
    transactionGet.mockReset();
    transactionSet.mockReset();
    transactionUpdate.mockReset();
    runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: transactionGet, set: transactionSet, update: transactionUpdate,
    }));
  });

  test("creates assignment and summary in one batch", async () => {
    transactionGet.mockResolvedValueOnce({ exists: () => true, data: () => ({ subjectIds: ["math"], studentIds: Array.from({ length: 20 }) }) });
    await createAssignment({
      title: "Bài tập 1",
      description: "",
      classId: "class-1",
      subjectId: "math",
      lessonPlanId: null,
      sessionId: null,
      dueAt: {} as never,
      submissionType: "text",
      maxScore: 10,
      status: "published",
      createdBy: "teacher-1",
    });

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transactionSet).toHaveBeenCalledTimes(2);
    expect(transactionSet).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ totalStudents: 20 }));
  });

  test("queries only assigned classes for a teacher", async () => {
    getCurrentUserDoc.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
    isAdminUser.mockReturnValue(false);
    isTeacherUser.mockReturnValue(true);
    listClasses.mockResolvedValue([{ id: "class-1" }, { id: "class-2" }]);
    getDocs
      .mockResolvedValueOnce({ docs: [{ id: "assignment-1", data: () => ({ dueAt: { toMillis: () => 1 } }) }] })
      .mockResolvedValueOnce({ docs: [{ id: "assignment-2", data: () => ({ dueAt: { toMillis: () => 2 } }) }] });

    const result = await listAssignments();

    expect(getDocs).toHaveBeenCalledTimes(2);
    expect(where).toHaveBeenCalledWith("classId", "==", "class-1");
    expect(where).toHaveBeenCalledWith("classId", "==", "class-2");
    expect(result.map((item) => item.id)).toEqual(["assignment-2", "assignment-1"]);
  });

  test("filters submissions server-side with studentId in-clause per class for a teacher", async () => {
    getCurrentUserDoc.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
    isTeacherUser.mockReturnValue(true);
    listClasses.mockResolvedValue([{ id: "class-1" }]);
    getDocs.mockResolvedValueOnce({ docs: [{ id: "sub-1", data: () => ({ studentId: "student-1" }) }] });

    const result = await listSubmissionsByStudents(["student-1", "student-2"]);

    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith("classId", "==", "class-1");
    expect(where).toHaveBeenCalledWith("studentId", "in", ["student-1", "student-2"]);
    expect(result.map((item) => item.id)).toEqual(["sub-1"]);
  });

  test("loads every assignment page for an admin", async () => {
    getCurrentUserDoc.mockResolvedValue({ uid: "admin-1", role: "admin" });
    isAdminUser.mockReturnValue(true);
    isTeacherUser.mockReturnValue(false);
    const page = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({
        id: `assignment-${offset + index}`,
        data: () => ({ dueAt: { toMillis: () => offset + index } }),
      })),
    });
    getDocs.mockResolvedValueOnce(page(0, 200)).mockResolvedValueOnce(page(200, 1));

    const result = await listAssignments();

    expect(result).toHaveLength(201);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  test("loads every submission instead of truncating a large class at 200", async () => {
    const page = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({
        id: `submission-${offset + index}`,
        data: () => ({ assignmentId: "assignment-1", classId: "class-1" }),
      })),
    });
    getDocs.mockResolvedValueOnce(page(0, 200)).mockResolvedValueOnce(page(200, 1));

    const result = await listSubmissions("assignment-1", "class-1");

    expect(result).toHaveLength(201);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  test("grades against the current assignment instead of a stale UI copy", async () => {
    transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ classId: "class-1", maxScore: 10 }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ assignmentId: "assignment-1", classId: "class-1" }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ totalStudents: 1 }) });

    await expect(gradeSubmission("submission-1", {
      id: "assignment-1", classId: "class-1", maxScore: 20,
    } as never, { score: 15, teacherComment: "", status: "graded", checkedBy: "teacher-1" }))
      .rejects.toThrow("SCORE_INVALID");
    expect(transactionUpdate).not.toHaveBeenCalled();
  });
});
