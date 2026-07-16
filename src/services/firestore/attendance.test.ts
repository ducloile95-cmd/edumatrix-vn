import { beforeEach, describe, expect, test, vi } from "vitest";

const { getDocs } = vi.hoisted(() => ({ getDocs: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "attendance-collection"),
  doc: vi.fn(),
  documentId: vi.fn(() => "document-id"),
  getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn((value) => ({ orderBy: value })),
  query: vi.fn((...parts) => parts),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  startAfter: vi.fn((value) => ({ startAfter: value })),
  where: vi.fn((...values) => ({ where: values })),
  writeBatch: vi.fn(),
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc: vi.fn(), isTeacherUser: vi.fn() }));
vi.mock("@/services/firestore/classes", () => ({ listClasses: vi.fn() }));
vi.mock("@/services/firestore/sessions", () => ({ listSessions: vi.fn() }));
vi.mock("@/services/firestore/students", () => ({ listStudents: vi.fn() }));

import { listAttendanceBySessionIds } from "@/services/firestore/attendance";

function snapshot(offset: number, count: number) {
  return {
    docs: Array.from({ length: count }, (_, index) => ({
      id: `attendance-${offset + index}`,
      data: () => ({ sessionId: "session-1", studentId: `student-${offset + index}` }),
    })),
  };
}

describe("listAttendanceBySessionIds", () => {
  beforeEach(() => getDocs.mockReset());

  test("continues after a full page instead of truncating at 500 records", async () => {
    getDocs.mockResolvedValueOnce(snapshot(0, 500)).mockResolvedValueOnce(snapshot(500, 100));

    const result = await listAttendanceBySessionIds(["session-1"]);

    expect(result).toHaveLength(600);
    expect(getDocs).toHaveBeenCalledTimes(2);
    expect(result[result.length - 1]?.id).toBe("attendance-599");
  });
});
