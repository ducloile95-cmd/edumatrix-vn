import { describe, expect, test, vi } from "vitest";

const { getDocs } = vi.hoisted(() => ({ getDocs: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs,
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn((...parts) => parts),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
  startAfter: vi.fn(),
  Timestamp: { now: vi.fn() },
  where: vi.fn(),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { listAllStandardLessons } from "@/services/firestore/standardLessons";

describe("listAllStandardLessons", () => {
  test("loads every approved lesson page for curriculum selection", async () => {
    const page = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({
        id: `lesson-${offset + index}`,
        data: () => ({ approvalStatus: "approved" }),
      })),
    });
    getDocs.mockResolvedValueOnce(page(0, 100)).mockResolvedValueOnce(page(100, 1));

    await expect(listAllStandardLessons({ approvalStatus: "approved" })).resolves.toHaveLength(101);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});
