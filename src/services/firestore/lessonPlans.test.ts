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
  addDoc: vi.fn(),
  collection: vi.fn((_db, name: string) => name),
  deleteDoc: vi.fn(),
  doc: vi.fn((...args: unknown[]) => args.length === 1
    ? { id: "plan-1", path: "lesson_plans/plan-1" }
    : `${args[1]}/${args[2]}`),
  getDoc: vi.fn(),
  getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn(),
  query: vi.fn((...values) => values),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where,
  writeBatch,
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc, isAdminUser, isTeacherUser }));
vi.mock("@/services/firestore/classes", () => ({ listClasses }));
vi.mock("@/services/firestore/sessions", () => ({ listSessionsByClass: vi.fn() }));
vi.mock("@/utils/lessonPlan", () => ({
  normalizeLessonPlan: (value: unknown) => value,
  normalizeLessonPlanTemplate: (value: unknown) => value,
}));

import { createLessonPlan, listLessonPlans } from "@/services/firestore/lessonPlans";

function snapshot(items: { id: string; updatedAt: number }[]) {
  return {
    docs: items.map((item) => ({
      id: item.id,
      data: () => ({ updatedAt: { toMillis: () => item.updatedAt } }),
    })),
  };
}

describe("listLessonPlans", () => {
  beforeEach(() => {
    getCurrentUserDoc.mockReset();
    getDocs.mockReset();
    isAdminUser.mockReset();
    isTeacherUser.mockReset();
    listClasses.mockReset();
    where.mockClear();
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchSet.mockReset();
    writeBatch.mockReset().mockReturnValue({ set: batchSet, update: vi.fn(), delete: vi.fn(), commit: batchCommit });
  });

  test("combines teacher-owned and assigned-class plans without duplicates", async () => {
    getCurrentUserDoc.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
    isAdminUser.mockReturnValue(false);
    isTeacherUser.mockReturnValue(true);
    listClasses.mockResolvedValue([{ id: "class-1" }]);
    getDocs
      .mockResolvedValueOnce(snapshot([{ id: "own-plan", updatedAt: 1 }, { id: "shared-plan", updatedAt: 2 }]))
      .mockResolvedValueOnce(snapshot([{ id: "shared-plan", updatedAt: 2 }, { id: "class-plan", updatedAt: 3 }]));

    const result = await listLessonPlans();

    expect(where).toHaveBeenCalledWith("createdBy", "==", "teacher-1");
    expect(where).toHaveBeenCalledWith("classId", "==", "class-1");
    expect(result.map((item) => item.id)).toEqual(["class-plan", "shared-plan", "own-plan"]);
  });

  test("creates a published plan and public summary in one batch", async () => {
    await createLessonPlan({ status: "published", classId: "class-1" } as never, "teacher-1");

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });
});
