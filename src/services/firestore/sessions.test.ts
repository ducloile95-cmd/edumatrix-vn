import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchCommit, batchSet, batchUpdate, getDoc, getDocs, runTransaction, transactionGet, transactionSet, transactionUpdate, writeBatch } = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  batchUpdate: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: vi.fn((value) => value) },
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((...args: unknown[]) => args.length === 1 ? "announcements/new" : `${args[1]}/${args[2]}`),
  getDoc,
  getDocs,
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
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc: vi.fn(), isAdminUser: vi.fn(), isTeacherUser: vi.fn() }));
vi.mock("@/services/firestore/classes", () => ({ listClasses: vi.fn() }));

import { getCurrentUserDoc, isAdminUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import { createSessions, listSessions, listSessionsByClass, updateSession } from "@/services/firestore/sessions";

describe("updateSession", () => {
  beforeEach(() => {
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchSet.mockReset();
    batchUpdate.mockReset();
    getDoc.mockReset();
    transactionGet.mockReset();
    transactionSet.mockReset();
    transactionUpdate.mockReset();
    runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: transactionGet, set: transactionSet, update: transactionUpdate,
    }));
    writeBatch.mockReset().mockReturnValue({ set: batchSet, update: batchUpdate, commit: batchCommit });
  });

  test("fans out deterministic schedule announcements to every student", async () => {
    transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ classId: "class-1" }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ studentIds: ["student-1", "student-2"] }) });

    await updateSession("session-1", { status: "cancelled", note: "Mưa lớn" });

    expect(transactionUpdate).toHaveBeenCalledTimes(1);
    expect(transactionSet).toHaveBeenCalledTimes(2);
    expect(transactionSet).toHaveBeenCalledWith(
      "announcements/schedule_session-1_student-1",
      expect.objectContaining({ classId: "class-1", studentId: "student-1" }),
    );
    expect(batchCommit).not.toHaveBeenCalled();
  });

  test("does not commit an announcement for a missing session", async () => {
    transactionGet.mockResolvedValue({ exists: () => false });

    await expect(updateSession("missing", { status: "cancelled" })).rejects.toThrow("SESSION_NOT_FOUND");
    expect(transactionSet).not.toHaveBeenCalled();
  });
});

describe("createSessions", () => {
  beforeEach(() => {
    transactionGet.mockReset()
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ status: "active", courseId: "course-1" }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ status: "active" }) });
    transactionSet.mockReset();
    runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({ get: transactionGet, set: transactionSet }));
  });

  test("writes every generated occurrence in one batch", async () => {
    const firstStart = new Date("2026-07-21T12:45:00.000Z");
    const secondStart = new Date("2026-07-22T12:45:00.000Z");

    await createSessions({
      classId: "class-1",
      title: "Buổi học",
      occurrences: [
        { startAt: firstStart, endAt: new Date("2026-07-21T14:00:00.000Z") },
        { startAt: secondStart, endAt: new Date("2026-07-22T14:00:00.000Z") },
      ],
      location: "Phòng 201",
      note: "",
      makeUpForSessionId: null,
    });

    expect(transactionSet).toHaveBeenCalledTimes(2);
    expect(transactionSet.mock.calls[0][1]).toMatchObject({ classId: "class-1", startAt: firstStart });
    expect(transactionSet.mock.calls[1][1]).toMatchObject({ classId: "class-1", startAt: secondStart });
  });

  test("rejects sessions for a cancelled class", async () => {
    transactionGet.mockReset().mockResolvedValueOnce({ exists: () => true, data: () => ({ status: "cancelled" }) });

    await expect(createSessions({
      classId: "class-1",
      title: "Buổi học",
      occurrences: [{
        startAt: new Date("2026-07-21T12:45:00.000Z"),
        endAt: new Date("2026-07-21T14:00:00.000Z"),
      }],
      location: "Phòng 201",
      note: "",
      makeUpForSessionId: null,
    })).rejects.toThrow("CLASS_NOT_SCHEDULABLE");
    expect(transactionSet).not.toHaveBeenCalled();
  });

  test("rejects sessions when the parent course is completed", async () => {
    transactionGet.mockReset()
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ status: "active", courseId: "course-1" }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ status: "completed" }) });

    await expect(createSessions({
      classId: "class-1", title: "Lesson", occurrences: [{ startAt: new Date(), endAt: new Date() }],
      location: "Room", note: "", makeUpForSessionId: null,
    })).rejects.toThrow("COURSE_NOT_SCHEDULABLE");
    expect(transactionSet).not.toHaveBeenCalled();
  });
});

describe("listSessionsByClass", () => {
  test("uses pageSize as a fetch size without truncating the class schedule", async () => {
    const page = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({
        id: `session-${offset + index}`,
        data: () => ({ classId: "class-1" }),
      })),
    });
    getDocs.mockReset().mockResolvedValueOnce(page(0, 100)).mockResolvedValueOnce(page(100, 1));

    const result = await listSessionsByClass("class-1", new Date("2026-01-01"), new Date("2026-12-31"), 100);

    expect(result).toHaveLength(101);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  test("does not truncate an admin schedule at 300 sessions", async () => {
    vi.mocked(getCurrentUserDoc).mockResolvedValue({ uid: "admin-1", role: "admin" } as never);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(listClasses).mockResolvedValue([{ id: "class-1", status: "active" }] as never);
    const page = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({
        id: `session-${offset + index}`,
        data: () => ({
          classId: "class-1",
          title: "Buổi học",
          startAt: { toMillis: () => offset + index },
          endAt: { toMillis: () => offset + index + 1 },
          status: "scheduled",
        }),
      })),
    });
    getDocs.mockReset().mockResolvedValueOnce(page(0, 300)).mockResolvedValueOnce(page(300, 1));

    const result = await listSessions(new Date("2026-01-01"), new Date("2026-12-31"));

    expect(result).toHaveLength(301);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});
