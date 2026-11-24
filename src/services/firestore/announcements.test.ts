import { beforeEach, describe, expect, test, vi } from "vitest";

const { getDocs } = vi.hoisted(() => ({ getDocs: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn((...values) => ({ orderBy: values })),
  query: vi.fn((...values) => values),
  startAfter: vi.fn((value) => ({ startAfter: value.id })),
  where: vi.fn((...values) => ({ where: values })),
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { limit } from "firebase/firestore";
import { listAnnouncementsByStudent } from "@/services/firestore/announcements";

function snapshot(items: Array<{ id: string; resolvedAt?: string }>) {
  return {
    docs: items.map((item) => ({
      id: item.id,
      data: () => ({ studentId: "student-1", message: item.id, resolvedAt: item.resolvedAt }),
    })),
  };
}

describe("listAnnouncementsByStudent", () => {
  beforeEach(() => vi.clearAllMocks());

  test("continues after a full page of resolved records", async () => {
    getDocs
      .mockResolvedValueOnce(snapshot(Array.from({ length: 50 }, (_, index) => ({
        id: `resolved-${index}`,
        resolvedAt: "done",
      }))))
      .mockResolvedValueOnce(snapshot([{ id: "unresolved-1" }]));

    const result = await listAnnouncementsByStudent("student-1", 1);

    expect(result.map((item) => item.id)).toEqual(["unresolved-1"]);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  test("uses the requested page size as the Firestore limit", async () => {
    getDocs.mockResolvedValue(snapshot([]));
    await listAnnouncementsByStudent("student-1", 20);
    expect(vi.mocked(limit)).toHaveBeenCalledWith(20);
  });
});
