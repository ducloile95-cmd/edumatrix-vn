import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchCommit, batchSet, batchUpdate, getDoc, writeBatch } = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  batchUpdate: vi.fn(),
  getDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: vi.fn((value) => value) },
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((...args: unknown[]) => args.length === 1 ? "announcements/new" : `${args[1]}/${args[2]}`),
  getDoc,
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  where: vi.fn(),
  writeBatch,
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc: vi.fn(), isAdminUser: vi.fn(), isTeacherUser: vi.fn() }));
vi.mock("@/services/firestore/classes", () => ({ listClasses: vi.fn() }));

import { createSessions, updateSession } from "@/services/firestore/sessions";

describe("updateSession", () => {
  beforeEach(() => {
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchSet.mockReset();
    batchUpdate.mockReset();
    getDoc.mockReset();
    writeBatch.mockReset().mockReturnValue({ set: batchSet, update: batchUpdate, commit: batchCommit });
  });

  test("updates a cancelled session and creates its announcement atomically", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ classId: "class-1" }) });

    await updateSession("session-1", { status: "cancelled", note: "Mưa lớn" });

    expect(batchUpdate).toHaveBeenCalledTimes(1);
    expect(batchSet).toHaveBeenCalledTimes(1);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  test("does not commit an announcement for a missing session", async () => {
    getDoc.mockResolvedValue({ exists: () => false });

    await expect(updateSession("missing", { status: "cancelled" })).rejects.toThrow("SESSION_NOT_FOUND");
    expect(writeBatch).not.toHaveBeenCalled();
  });
});

describe("createSessions", () => {
  beforeEach(() => {
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchSet.mockReset();
    writeBatch.mockReset().mockReturnValue({ set: batchSet, update: batchUpdate, commit: batchCommit });
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

    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchSet.mock.calls[0][1]).toMatchObject({ classId: "class-1", startAt: firstStart });
    expect(batchSet.mock.calls[1][1]).toMatchObject({ classId: "class-1", startAt: secondStart });
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });
});
