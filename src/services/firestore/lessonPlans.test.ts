import { beforeEach, describe, expect, test, vi } from "vitest";

const { getCurrentUserDoc, getDocs, isAdminUser, isTeacherUser, listClasses, runTransaction, transactionDelete, transactionGet, transactionSet, transactionUpdate, where } = vi.hoisted(() => ({
  getCurrentUserDoc: vi.fn(),
  getDocs: vi.fn(),
  isAdminUser: vi.fn(),
  isTeacherUser: vi.fn(),
  listClasses: vi.fn(),
  runTransaction: vi.fn(),
  transactionDelete: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
  where: vi.fn((...values) => ({ where: values })),
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
  runTransaction,
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where,
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc, isAdminUser, isTeacherUser }));
vi.mock("@/services/firestore/classes", () => ({ listClasses }));
vi.mock("@/services/firestore/sessions", () => ({ listSessionsByClass: vi.fn() }));
vi.mock("@/utils/lessonPlan", () => ({
  normalizeLessonPlan: (value: unknown) => value,
  normalizeLessonPlanTemplate: (value: unknown) => value,
}));

import { createLessonPlan, listLessonPlans, updateLessonPlan } from "@/services/firestore/lessonPlans";

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
    transactionDelete.mockReset();
    transactionGet.mockReset();
    transactionSet.mockReset();
    transactionUpdate.mockReset();
    runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      delete: transactionDelete,
      get: transactionGet,
      set: transactionSet,
      update: transactionUpdate,
    }));
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

  test("creates a published plan and public summary in one transaction", async () => {
    await createLessonPlan({ status: "published", classId: "class-1" } as never, "teacher-1");

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transactionSet).toHaveBeenCalledTimes(2);
  });

  test("clears the previous session pointer when a plan moves", async () => {
    transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ sessionId: "session-old" }) })
      .mockResolvedValueOnce({ id: "session-old", ref: "sessions/session-old", exists: () => true, data: () => ({ classId: "class-1", lessonPlanId: "plan-1" }) })
      .mockResolvedValueOnce({ id: "session-new", ref: "sessions/session-new", exists: () => true, data: () => ({ classId: "class-1", lessonPlanId: null }) });

    await updateLessonPlan("plan-1", { status: "draft", classId: "class-1", sessionId: "session-new" } as never);

    expect(transactionUpdate).toHaveBeenCalledWith("sessions/session-old", expect.objectContaining({ lessonPlanId: null }));
    expect(transactionUpdate).toHaveBeenCalledWith("sessions/session-new", expect.objectContaining({ lessonPlanId: "plan-1" }));
  });
});
