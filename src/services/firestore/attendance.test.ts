import { beforeEach, describe, expect, test, vi } from "vitest";

const { getDocs, where } = vi.hoisted(() => ({ getDocs: vi.fn(), where: vi.fn((...values) => ({ where: values })) }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "attendance-collection"),
  doc: vi.fn(),
  documentId: vi.fn(() => "document-id"),
  getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn((value) => ({ orderBy: value })),
  query: vi.fn((...parts) => parts),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn(),
  startAfter: vi.fn((value) => ({ startAfter: value })),
  where,
  writeBatch: vi.fn(),
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc: vi.fn(), isTeacherUser: vi.fn() }));
vi.mock("@/services/firestore/classes", () => ({ listClasses: vi.fn() }));
vi.mock("@/services/firestore/sessions", () => ({ listSessions: vi.fn() }));
vi.mock("@/services/firestore/students", () => ({ listStudents: vi.fn() }));

import { listAttendanceBySession, listAttendanceBySessionIds, queueAttendanceEntryWrite } from "@/services/firestore/attendance";

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
    where.mockClear();
  });

  test("continues after a full page instead of truncating at 500 records", async () => {
    getDocs.mockResolvedValueOnce(snapshot(0, 500)).mockResolvedValueOnce(snapshot(500, 100));

    const result = await listAttendanceBySessionIds(["session-1"]);

    expect(result).toHaveLength(600);
    expect(getDocs).toHaveBeenCalledTimes(2);
    expect(result[result.length - 1]?.id).toBe("attendance-599");
  });
});

describe("session-scoped attendance", () => {
  test("queries by both class and session so Teacher rules can prove scope", async () => {
    getDocs.mockResolvedValueOnce(snapshot(0, 1));

    await listAttendanceBySession("session-1", "class-1");

    expect(where).toHaveBeenCalledWith("classId", "==", "class-1");
    expect(where).toHaveBeenCalledWith("sessionId", "==", "session-1");
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
});
