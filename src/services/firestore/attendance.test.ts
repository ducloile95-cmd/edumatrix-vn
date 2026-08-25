import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchCommit, batchSet, getCurrentUserDoc, getDocs, isTeacherUser, listClasses, where, writeBatch } = vi.hoisted(() => ({
  batchCommit: vi.fn(), batchSet: vi.fn(), getDocs: vi.fn(),
  getCurrentUserDoc: vi.fn(), isTeacherUser: vi.fn(), listClasses: vi.fn(),
  where: vi.fn((...values) => ({ where: values })), writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "attendance-collection"),
  doc: vi.fn(),
  documentId: vi.fn(() => "document-id"),
  getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn((value) => ({ orderBy: value })),
  query: vi.fn((...parts) => parts),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn(),
  startAfter: vi.fn((value) => ({ startAfter: value })),
  where,
  writeBatch,
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc, isTeacherUser }));
vi.mock("@/services/firestore/classes", () => ({ listClasses }));
vi.mock("@/services/firestore/sessions", () => ({ listSessions: vi.fn() }));
vi.mock("@/services/firestore/students", () => ({ listStudents: vi.fn() }));

import { listAttendanceByClass, listAttendanceBySession, listAttendanceBySessionIds, listAttendanceByStudents, queueAttendanceEntryWrite, saveAttendance } from "@/services/firestore/attendance";

function snapshot(offset: number, count: number) {
  return {
    docs: Array.from({ length: count }, (_, index) => ({
      id: `attendance-${offset + index}`,
      data: () => ({ sessionId: "session-1", studentId: `student-${offset + index}` }),
    })),
  };
}

describe("listAttendanceBySessionIds", () => {
  beforeEach(() => {
    getDocs.mockReset();
    getCurrentUserDoc.mockReset().mockResolvedValue({ role: "admin" });
    isTeacherUser.mockReset().mockReturnValue(false);
    listClasses.mockReset();
    where.mockClear();
  });

  test("continues after a full page instead of truncating at 500 records", async () => {
    getDocs.mockResolvedValueOnce(snapshot(0, 500)).mockResolvedValueOnce(snapshot(500, 100));

    const result = await listAttendanceBySessionIds(["session-1"]);

    expect(result).toHaveLength(600);
    expect(getDocs).toHaveBeenCalledTimes(2);
    expect(result[result.length - 1]?.id).toBe("attendance-599");
  });

  test("paginates teacher-scoped attendance instead of truncating a student's history", async () => {
    getCurrentUserDoc.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
    isTeacherUser.mockReturnValue(true);
    listClasses.mockResolvedValue([{ id: "class-1" }]);
    const attendancePage = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({
        id: `attendance-${offset + index}`,
        data: () => ({ markedAt: { toMillis: () => offset + index } }),
      })),
    });
    getDocs.mockResolvedValueOnce(attendancePage(0, 500)).mockResolvedValueOnce(attendancePage(500, 1));

    const result = await listAttendanceByStudents(["student-1"]);

    expect(result).toHaveLength(501);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});

describe("session-scoped attendance", () => {
  beforeEach(() => {
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchSet.mockReset();
    writeBatch.mockReset().mockReturnValue({ set: batchSet, commit: batchCommit });
  });

  test("queries by both class and session so Teacher rules can prove scope", async () => {
    getDocs.mockResolvedValueOnce(snapshot(0, 1));

    await listAttendanceBySession("session-1", "class-1");

    expect(where).toHaveBeenCalledWith("classId", "==", "class-1");
    expect(where).toHaveBeenCalledWith("sessionId", "==", "session-1");
  });

  test("loads class attendance with the class scope required by Teacher rules", async () => {
    getDocs.mockResolvedValueOnce(snapshot(0, 2));

    const result = await listAttendanceByClass("class-1");

    expect(where).toHaveBeenCalledWith("classId", "==", "class-1");
    expect(result).toHaveLength(2);
  });

  test("loads every attendance record when a session has more than 500 students", async () => {
    getDocs.mockReset().mockResolvedValueOnce(snapshot(0, 500)).mockResolvedValueOnce(snapshot(500, 1));

    const result = await listAttendanceBySession("session-1", "class-1");

    expect(result).toHaveLength(501);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  test("resolves an old alert when attendance becomes present", () => {
    const batch = { set: vi.fn() };

    queueAttendanceEntryWrite(
      batch as never,
      "session-1",
      "class-1",
      { studentId: "student-1", status: "present", note: " updated " },
      "teacher-1",
    );

    expect(batch.set).toHaveBeenCalledTimes(2);
    expect(batch.set.mock.calls[1]?.[1]).toMatchObject({
      type: "attendance_alert",
      message: "updated",
      resolvedAt: "server-time",
    });
  });

  test("keeps an absent alert active", () => {
    const batch = { set: vi.fn() };

    queueAttendanceEntryWrite(
      batch as never,
      "session-1",
      "class-1",
      { studentId: "student-1", status: "absent", note: "" },
      "teacher-1",
    );

    expect(batch.set.mock.calls[1]?.[1]).toMatchObject({ resolvedAt: null });
  });

  test("commits roster entries and their summary atomically", async () => {
    await saveAttendance("session-1", "class-1", [
      { studentId: "student-1", status: "present", note: "" },
      { studentId: "student-2", status: "absent", note: "" },
    ], "teacher-1");

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(batchSet).toHaveBeenCalledTimes(5);
    expect(batchSet).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ total: 2, present: 1, absent: 1 }));
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });
});
