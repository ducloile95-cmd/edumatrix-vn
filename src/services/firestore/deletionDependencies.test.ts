import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCountFromServer: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  getCountFromServer: mocks.getCountFromServer,
  query: vi.fn((...parts) => parts),
  where: vi.fn((field: string, operator: string, value: string) => ({ field, operator, value })),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import {
  assertDeletionAllowed,
  DeletionBlockedError,
  inspectDeletionDependencies,
} from "./deletionDependencies";

describe("deletion dependency preflight", () => {
  beforeEach(() => {
    mocks.getCountFromServer.mockReset().mockResolvedValue({ data: () => ({ count: 0 }) });
  });

  test("returns exact blocker counts", async () => {
    mocks.getCountFromServer
      .mockResolvedValueOnce({ data: () => ({ count: 2 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 1 }) });

    await expect(inspectDeletionDependencies("subject", "MATH")).resolves.toEqual(expect.objectContaining({
      allowed: false,
      total: 3,
      blockers: [
        { key: "courses", label: "Khóa học", count: 2 },
        { key: "classes", label: "Lớp học", count: 1 },
      ],
    }));
  });

  test("throws a typed error before deletion when a dependency exists", async () => {
    mocks.getCountFromServer.mockResolvedValueOnce({ data: () => ({ count: 1 }) });

    const error = await assertDeletionAllowed("user", "teacher-1").catch((cause) => cause);
    expect(error).toBeInstanceOf(DeletionBlockedError);
    expect(error.report.total).toBe(1);
  });
});
