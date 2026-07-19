import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchCommit, batchSet, getCurrentUserDoc, getDocs, isAdminUser, isTeacherUser, listClasses, where, writeBatch } = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  getCurrentUserDoc: vi.fn(),
  getDocs: vi.fn(),
  isAdminUser: vi.fn(),
  isTeacherUser: vi.fn(),
  listClasses: vi.fn(),
  where: vi.fn((...values) => ({ where: values })),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((...args: unknown[]) => args.length === 1
    ? { id: "assignment-1", path: "assignments/assignment-1" }
    : `${args[1]}/${args[2]}`),
  getDocs,
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn(),
  where,
  writeBatch,
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc, isAdminUser, isTeacherUser }));
vi.mock("@/services/firestore/classes", () => ({ listClasses }));

import { createAssignment, listAssignments } from "@/services/firestore/assignments";

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
  });

  test("creates assignment and summary in one batch", async () => {
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
    }, 20);

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
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
});
