import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ assertDeletionAllowed: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), runTransaction: vi.fn(), transactionDelete: vi.fn(), transactionGet: vi.fn(), transactionSet: vi.fn(), transactionUpdate: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: vi.fn((date: Date) => ({ toMillis: () => date.getTime() })) },
  addDoc: vi.fn(), collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name?: string, id?: string) => id ? `${name}/${id}` : `${_db}/new`), getDoc: mocks.getDoc, getDocs: mocks.getDocs,
  limit: vi.fn(), orderBy: vi.fn(), query: vi.fn((...parts) => parts),
  runTransaction: mocks.runTransaction, serverTimestamp: vi.fn(() => "server-time"), where: vi.fn(),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/deletionDependencies", () => ({ assertDeletionAllowed: mocks.assertDeletionAllowed }));

import { deleteCourse, setCourseStatus, updateCourse } from "./courses";

const input = {
  name: "Course", subjectIds: ["math"], teacherIds: ["teacher-1"], pricePerSession: 100_000,
  totalSessions: 20, startDate: "2026-08-01", endDate: "2026-12-31", status: "active" as const,
};

describe("course and active class invariants", () => {
  beforeEach(() => {
    mocks.getDoc.mockReset().mockResolvedValue({ exists: () => true, data: () => ({ classRevision: 0 }) });
    mocks.assertDeletionAllowed.mockReset().mockResolvedValue(undefined);
    mocks.getDocs.mockReset().mockResolvedValue({ docs: [{ ref: "classes/class-1" }] });
    mocks.transactionDelete.mockReset(); mocks.transactionGet.mockReset(); mocks.transactionUpdate.mockReset();
    mocks.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      delete: mocks.transactionDelete, get: mocks.transactionGet, set: mocks.transactionSet, update: mocks.transactionUpdate,
    }));
  });

  test("does not remove a teacher still assigned to an active class", async () => {
    mocks.transactionGet.mockImplementation(async (ref: string) => {
      const records: Record<string, unknown> = {
        "subjects/math": { status: "active" },
        "users/teacher-1": { role: "teacher", status: "active" },
        "courses/course-1": { status: "active" },
        "classes/class-1": { status: "active", subjectIds: ["math"], teacherIds: ["teacher-2"] },
      };
      const data = records[ref];
      return { exists: () => data !== undefined, data: () => data };
    });

    await expect(updateCourse("course-1", input)).rejects.toThrow("COURSE_CLASS_TEACHER_MISMATCH");
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });

  test("does not complete a course with an active class", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ classRevision: 0 }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ status: "active" }) });

    await expect(setCourseStatus("course-1", "completed")).rejects.toThrow("COURSE_HAS_ACTIVE_CLASSES");
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });

  test("re-queries active classes when class revision changes before the transaction", async () => {
    mocks.getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ classRevision: 0 }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ classRevision: 0 }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ classRevision: 1 }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ classRevision: 1 }) });
    mocks.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ ref: "classes/class-new" }] });
    mocks.transactionGet.mockImplementation(async (ref: string) => ({
      exists: () => true,
      data: () => ref === "courses/course-1" ? { classRevision: 1 } : { status: "active" },
    }));

    await expect(setCourseStatus("course-1", "completed")).rejects.toThrow("COURSE_HAS_ACTIVE_CLASSES");
    expect(mocks.getDocs).toHaveBeenCalledTimes(2);
  });

  test("hard deletes a course without class references", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });
    mocks.transactionGet.mockResolvedValue({ exists: () => true, data: () => ({ classRevision: 0 }) });

    await deleteCourse("course-1");

    expect(mocks.transactionDelete).toHaveBeenCalledWith("courses/course-1");
  });

  test("refuses to hard delete a referenced course", async () => {
    mocks.assertDeletionAllowed.mockRejectedValueOnce(new Error("DELETION_BLOCKED"));

    await expect(deleteCourse("course-1")).rejects.toThrow("DELETION_BLOCKED");
    expect(mocks.transactionDelete).not.toHaveBeenCalled();
  });
});
