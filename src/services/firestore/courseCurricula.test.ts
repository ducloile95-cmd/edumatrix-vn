import { beforeEach, describe, expect, test, vi } from "vitest";

type Ref = { id: string; path: string };
const harness = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  queue: Promise.resolve() as Promise<unknown>,
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
}));

function snapshot(ref: Ref) {
  const value = harness.documents.get(ref.path);
  return { id: ref.id, ref, exists: () => Boolean(value), data: () => value };
}

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id: string) => ({ id, path: `${name}/${id}` })),
  getDoc: vi.fn(), getDocs: harness.getDocs, limit: vi.fn(), orderBy: vi.fn(), query: vi.fn(),
  runTransaction: harness.runTransaction, serverTimestamp: vi.fn(() => "server-time"), where: vi.fn(),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { createCourseCurriculumDraft, publishCourseCurriculum, swapCourseCurriculumItems, updateCourseCurriculumItem } from "./courseCurricula";

function executeTransaction<T>(callback: (transaction: {
  get: (ref: Ref) => Promise<ReturnType<typeof snapshot>>;
  set: (ref: Ref, value: Record<string, unknown>) => void;
  update: (ref: Ref, value: Record<string, unknown>) => void;
}) => Promise<T>): Promise<T> {
  const run = async () => {
    const writes: Array<() => void> = [];
    const result = await callback({
      get: async (ref) => snapshot(ref),
      set: (ref, value) => writes.push(() => harness.documents.set(ref.path, value)),
      update: (ref, value) => writes.push(() => {
        const current = harness.documents.get(ref.path);
        if (!current) throw new Error(`missing ${ref.path}`);
        harness.documents.set(ref.path, { ...current, ...value });
      }),
    });
    writes.forEach((write) => write());
    return result;
  };
  const pending = harness.queue.then(run, run);
  harness.queue = pending.catch(() => undefined);
  return pending;
}

function curriculum(version: number) {
  return {
    courseId: "course-1", version, title: `Version ${version}`,
    itemIds: [`course-1_v${version}_s001`], itemCount: 1, totalDurationMinutes: 90,
    status: "draft", publishedBy: null, publishedAt: null, revision: 1,
    createdAt: "time", updatedAt: "time",
  };
}

function item(version: number, standardLessonId: string | null = "lesson-1") {
  return {
    courseId: "course-1", curriculumVersion: version, sequenceNumber: 1, subjectId: "subject-1",
    title: "Lesson", standardLessonId, durationMinutes: 90, status: "ready", createdAt: "time", updatedAt: "time",
  };
}

describe("course curriculum transactions", () => {
  beforeEach(() => {
    harness.documents.clear();
    harness.queue = Promise.resolve();
    harness.getDocs.mockReset().mockResolvedValue({ empty: true, docs: [] });
    harness.runTransaction.mockReset().mockImplementation((_db, callback) => executeTransaction(callback));
    harness.documents.set("courses/course-1", {
      totalSessions: 1, subjectIds: ["subject-1"], curriculumVersionCounter: 0,
      activeCurriculumId: null, activeCurriculumVersion: null,
    });
    harness.documents.set("standard_lessons/lesson-1", {
      subjectId: "subject-1", approvalStatus: "approved",
    });
  });

  test("allocates distinct versions for simultaneous draft requests", async () => {
    const results = await Promise.all([
      createCourseCurriculumDraft("course-1", "First", "admin-1"),
      createCourseCurriculumDraft("course-1", "Second", "admin-1"),
    ]);
    expect(results.sort()).toEqual(["course-1_v1", "course-1_v2"]);
    expect(harness.documents.get("courses/course-1")?.curriculumVersionCounter).toBe(2);
    expect(harness.getDocs).not.toHaveBeenCalled();
  });

  test("does not overwrite a legacy curriculum when the counter is stale", async () => {
    harness.documents.set("course_curricula/course-1_v1", curriculum(1));

    await expect(createCourseCurriculumDraft("course-1", "New draft", "admin-1"))
      .rejects.toThrow("CURRICULUM_VERSION_COUNTER_STALE");
    expect(harness.documents.get("course_curricula/course-1_v1")?.title).toBe("Version 1");
    expect(harness.documents.get("courses/course-1")?.curriculumVersionCounter).toBe(0);
  });

  test("rejects a legacy course above 200 sessions without creating partial data", async () => {
    harness.documents.set("courses/course-1", { totalSessions: 201, subjectIds: ["subject-1"], curriculumVersionCounter: 0 });
    await expect(createCourseCurriculumDraft("course-1", "Too large", "admin-1")).rejects.toThrow("COURSE_SESSION_LIMIT");
    expect([...harness.documents.keys()].some((key) => key.startsWith("course_curricula/"))).toBe(false);
  });

  test("rolls back publish when an item has no standard lesson", async () => {
    harness.documents.set("course_curricula/course-1_v1", curriculum(1));
    harness.documents.set("course_curriculum_items/course-1_v1_s001", item(1, null));
    await expect(publishCourseCurriculum("course-1", 1, "admin-1")).rejects.toThrow();
    expect(harness.documents.get("course_curricula/course-1_v1")?.status).toBe("draft");
    expect(harness.documents.get("courses/course-1")?.activeCurriculumId).toBeNull();
  });

  test("rolls back publish for a missing item or discontinuous sequence", async () => {
    harness.documents.set("course_curricula/course-1_v1", curriculum(1));
    await expect(publishCourseCurriculum("course-1", 1, "admin-1")).rejects.toThrow("CURRICULUM_SEQUENCE_INVALID");
    harness.documents.set("course_curriculum_items/course-1_v1_s001", { ...item(1), sequenceNumber: 2 });
    await expect(publishCourseCurriculum("course-1", 1, "admin-1")).rejects.toThrow("CURRICULUM_SEQUENCE_INVALID");
    expect(harness.documents.get("course_curricula/course-1_v1")?.status).toBe("draft");
    expect(harness.documents.get("courses/course-1")?.activeCurriculumId).toBeNull();
  });

  test("rolls back publish when the standard lesson is not approved", async () => {
    harness.documents.set("course_curricula/course-1_v1", curriculum(1));
    harness.documents.set("course_curriculum_items/course-1_v1_s001", item(1));
    harness.documents.set("standard_lessons/lesson-1", { subjectId: "subject-1", approvalStatus: "pending" });

    await expect(publishCourseCurriculum("course-1", 1, "admin-1")).rejects.toThrow("STANDARD_LESSON_NOT_APPROVED");
    expect(harness.documents.get("course_curricula/course-1_v1")?.status).toBe("draft");
  });

  test("simultaneous publishes leave one active pointer and supersede the previous winner", async () => {
    harness.documents.set("course_curricula/course-1_v1", curriculum(1));
    harness.documents.set("course_curricula/course-1_v2", curriculum(2));
    harness.documents.set("course_curriculum_items/course-1_v1_s001", item(1));
    harness.documents.set("course_curriculum_items/course-1_v2_s001", item(2));
    await Promise.all([
      publishCourseCurriculum("course-1", 1, "admin-1"),
      publishCourseCurriculum("course-1", 2, "admin-1"),
    ]);
    expect(harness.documents.get("courses/course-1")?.activeCurriculumId).toBe("course-1_v2");
    expect(harness.documents.get("course_curricula/course-1_v1")?.status).toBe("superseded");
    expect(harness.documents.get("course_curricula/course-1_v2")?.status).toBe("published");
  });

  test("does not allow editing an item after its curriculum is published", async () => {
    harness.documents.set("course_curricula/course-1_v1", { ...curriculum(1), status: "published" });
    harness.documents.set("course_curriculum_items/course-1_v1_s001", item(1));

    await expect(updateCourseCurriculumItem("course-1_v1_s001", { title: "Changed" }))
      .rejects.toThrow("CURRICULUM_NOT_EDITABLE");
    expect(harness.documents.get("course_curriculum_items/course-1_v1_s001")?.title).toBe("Lesson");
  });

  test("updates item duration and curriculum total in one transaction", async () => {
    harness.documents.set("course_curricula/course-1_v1", curriculum(1));
    harness.documents.set("course_curriculum_items/course-1_v1_s001", item(1));

    await updateCourseCurriculumItem("course-1_v1_s001", { durationMinutes: 60 });
    expect(harness.documents.get("course_curriculum_items/course-1_v1_s001")?.durationMinutes).toBe(60);
    expect(harness.documents.get("course_curricula/course-1_v1")?.totalDurationMinutes).toBe(60);
  });

  test("reorders curriculum content without changing immutable sequence identity", async () => {
    harness.documents.set("course_curricula/course-1_v1", {
      ...curriculum(1), itemIds: ["course-1_v1_s001", "course-1_v1_s002"], itemCount: 2, revision: 1,
    });
    harness.documents.set("course_curriculum_items/course-1_v1_s001", { ...item(1), title: "First", sequenceNumber: 1 });
    harness.documents.set("course_curriculum_items/course-1_v1_s002", { ...item(1), title: "Second", sequenceNumber: 2 });

    await swapCourseCurriculumItems("course-1_v1_s001", "course-1_v1_s002");

    expect(harness.documents.get("course_curriculum_items/course-1_v1_s001")).toMatchObject({ title: "Second", sequenceNumber: 1 });
    expect(harness.documents.get("course_curriculum_items/course-1_v1_s002")).toMatchObject({ title: "First", sequenceNumber: 2 });
    expect(harness.documents.get("course_curricula/course-1_v1")?.revision).toBe(2);
  });
});
