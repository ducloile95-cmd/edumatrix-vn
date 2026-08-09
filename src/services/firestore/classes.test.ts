import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchCommit, batchSet, batchUpdate, getCurrentUserDoc, getDoc, getDocs, isAdminUser, isTeacherUser, runTransaction, transactionGet, transactionSet, transactionUpdate, writeBatch } = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  batchUpdate: vi.fn(),
  getCurrentUserDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  isAdminUser: vi.fn(),
  isTeacherUser: vi.fn(),
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: vi.fn((value) => value) },
  addDoc: vi.fn(),
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id?: string) => id ? `${name}/${id}` : `${name}/new`),
  getDoc,
  getDocs,
  increment: vi.fn((value) => ({ increment: value })),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
  startAfter: vi.fn((value) => value),
  where: vi.fn(),
  writeBatch,
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({
  getCurrentUserDoc,
  isAdminUser,
  isTeacherUser,
}));

import { createClass, createClassWithSchedule, deleteClass, listAccessibleClassesByIds, listClasses, updateClass } from "@/services/firestore/classes";

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
      set: transactionSet,
      update: transactionUpdate,
    }));
  });

  test("recomputes each student's teachers from all current classes", async () => {
    transactionGet.mockImplementation(async (ref: string) => {
      if (ref === "classes/class-1") return {
        exists: () => true,
        data: () => ({ courseId: "course-1", teacherIds: ["teacher-old"], studentIds: ["student-1"] }),
      };
      if (ref === "courses/course-1") return {
        exists: () => true,
        data: () => ({ status: "active", subjectIds: ["subject-1"], teacherIds: ["teacher-new"] }),
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
    transactionGet.mockImplementation(async (ref: string) => ({
      exists: () => true,
      data: () => ref === "classes/class-1"
        ? { courseId: "course-1", teacherIds: ["teacher-new"], studentIds: ["student-1"] }
        : { status: "active", subjectIds: ["subject-1"], teacherIds: ["teacher-new"] },
    }));

    await updateClass("class-1", input);

    expect(transactionGet).toHaveBeenCalledTimes(2);
    expect(transactionUpdate).toHaveBeenCalledTimes(2);
  });
});

describe("createClass reference invariants", () => {
  beforeEach(() => {
    transactionSet.mockReset();
    transactionGet.mockReset().mockResolvedValue({
      exists: () => true,
      data: () => ({ status: "active", subjectIds: ["subject-1"], teacherIds: ["teacher-1"] }),
    });
    runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: transactionGet,
      set: transactionSet,
      update: transactionUpdate,
    }));
  });

  test("rejects a class without a subject even when the course exists", async () => {
    await expect(createClass({ ...input, subjectIds: [] })).rejects.toThrow("CLASS_SUBJECT_REQUIRED");
    expect(transactionSet).not.toHaveBeenCalled();
  });

  test("rejects duplicate subject references", async () => {
    await expect(createClass({ ...input, subjectIds: ["subject-1", "subject-1"] }))
      .rejects.toThrow("CLASS_REFERENCE_DUPLICATE");
    expect(transactionSet).not.toHaveBeenCalled();
  });
});

describe("listAccessibleClassesByIds", () => {
  beforeEach(() => getDoc.mockReset());

  test("keeps readable classes and ignores a stale viewer class link", async () => {
    getDoc.mockImplementation(async (ref: string) => {
      if (ref === "classes/class-stale") {
        throw Object.assign(new Error("stale class link"), { code: "permission-denied" });
      }
      return {
        id: "class-active",
        exists: () => true,
        data: () => ({
          name: "Class active",
          courseId: "course-1",
          subjectIds: [],
          teacherIds: [],
          studentIds: [],
          scheduleText: "",
          location: "",
          status: "active",
          createdAt: "time",
          updatedAt: "time",
        }),
      };
    });

    await expect(listAccessibleClassesByIds(["class-active", "class-stale"]))
      .resolves.toEqual([expect.objectContaining({ id: "class-active", name: "Class active" })]);
  });
});

describe("listClasses pagination", () => {
  test("loads all class pages instead of truncating after 200", async () => {
    const klass = (id: string) => ({
      id,
      data: () => ({
        name: id, courseId: "course-1", subjectIds: ["subject-1"], teacherIds: [], studentIds: [],
        scheduleText: "", location: "", status: "active", createdAt: "time", updatedAt: "time",
      }),
    });
    getCurrentUserDoc.mockResolvedValue({ uid: "admin-1", role: "admin" });
    isAdminUser.mockReturnValue(true);
    isTeacherUser.mockReturnValue(false);
    getDocs.mockReset()
      .mockResolvedValueOnce({ docs: Array.from({ length: 200 }, (_, index) => klass(`C${index}`)), size: 200 })
      .mockResolvedValueOnce({ docs: [klass("C200")], size: 1 });

    await expect(listClasses()).resolves.toHaveLength(201);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});

describe("deleteClass pagination", () => {
  beforeEach(() => {
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchUpdate.mockReset();
    writeBatch.mockReset().mockReturnValue({ update: batchUpdate, commit: batchCommit });
    getDocs.mockReset();
    getDoc.mockReset().mockResolvedValue({
      exists: () => true,
      data: () => ({ courseId: "course-1" }),
    });
  });

  function page(offset: number, count: number, status = "scheduled") {
    const docs = Array.from({ length: count }, (_, index) => ({
      id: `session-${offset + index}`,
      ref: `sessions/session-${offset + index}`,
      data: () => ({ status }),
    }));
    return { docs, size: docs.length };
  }

  test("cancels every session across batches and can be retried idempotently", async () => {
    getDocs.mockResolvedValueOnce(page(0, 498)).mockResolvedValueOnce(page(498, 3));
    await deleteClass("class-1");
    expect(batchCommit).toHaveBeenCalledTimes(2);
    expect(batchUpdate).toHaveBeenCalledTimes(503);

    batchCommit.mockClear();
    batchUpdate.mockClear();
    getDocs.mockResolvedValueOnce(page(0, 498, "cancelled")).mockResolvedValueOnce(page(498, 3, "cancelled"));
    await deleteClass("class-1");
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(batchUpdate).toHaveBeenCalledTimes(2);
  });
});

describe("createClassWithSchedule course invariant", () => {
  beforeEach(() => {
    transactionGet.mockReset().mockResolvedValue({
      exists: () => true,
      data: () => ({
        activeCurriculumId: null,
        activeCurriculumVersion: null,
        status: "active",
        subjectIds: ["subject-1"],
        teacherIds: ["teacher-new"],
        totalSessions: 12,
      }),
    });
    transactionSet.mockReset();
    runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: transactionGet,
      set: transactionSet,
      update: transactionUpdate,
    }));
    batchSet.mockReset();
    writeBatch.mockReset().mockReturnValue({ set: batchSet, update: batchUpdate, commit: batchCommit });
  });

  test("rejects a recurrence count different from the course", async () => {
    await expect(createClassWithSchedule({
      ...input,
      recurrence: {
        daysOfWeek: [1, 3],
        startTime: "18:00",
        endTime: "19:30",
        startDate: new Date("2026-08-03T00:00:00"),
        sessionCount: 13,
      },
    })).rejects.toThrow("CLASS_COURSE_SESSION_MISMATCH");
    expect(transactionSet).not.toHaveBeenCalled();
  });

  test("rejects a published curriculum whose item identity is inconsistent", async () => {
    transactionGet.mockImplementation(async (ref: string) => {
      if (ref === "courses/course-1") return {
        exists: () => true,
        data: () => ({
          activeCurriculumId: "course-1_v1", activeCurriculumVersion: 1, status: "active",
          subjectIds: ["subject-1"], teacherIds: ["teacher-new"], totalSessions: 1,
        }),
      };
      if (ref === "course_curricula/course-1_v1") return {
        exists: () => true,
        data: () => ({
          courseId: "course-1", version: 1, status: "published", itemCount: 1,
          itemIds: ["course-1_v1_s001"],
        }),
      };
      return {
        id: "course-1_v1_s001",
        exists: () => true,
        data: () => ({
          courseId: "wrong-course", curriculumVersion: 1, sequenceNumber: 1,
          subjectId: "subject-1", status: "ready", standardLessonId: "lesson-1",
        }),
      };
    });

    await expect(createClassWithSchedule({
      ...input,
      recurrence: {
        daysOfWeek: [1], startTime: "18:00", endTime: "19:30",
        startDate: new Date("2026-08-03T00:00:00"), sessionCount: 1,
      },
    })).rejects.toThrow("CURRICULUM_ITEM_INVALID");
    expect(transactionSet).not.toHaveBeenCalled();
  });
});
