import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  transactionDelete: vi.fn(),
  transactionGet: vi.fn(),
  assertDeletionAllowed: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id: string) => `${name}/${id}`),
  getDocs: mocks.getDocs,
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn((...parts) => parts),
  runTransaction: mocks.runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/deletionDependencies", () => ({ assertDeletionAllowed: mocks.assertDeletionAllowed }));

import { deleteSubject } from "./subjects";

describe("deleteSubject", () => {
  beforeEach(() => {
    mocks.getDocs.mockReset().mockResolvedValue({ empty: true });
    mocks.assertDeletionAllowed.mockReset().mockResolvedValue(undefined);
    mocks.transactionDelete.mockReset();
    mocks.transactionGet.mockReset().mockResolvedValue({ exists: () => true });
    mocks.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      delete: mocks.transactionDelete,
      get: mocks.transactionGet,
    }));
  });

  test("hard deletes an unreferenced subject", async () => {
    await deleteSubject("MATH");

    expect(mocks.transactionDelete).toHaveBeenCalledWith("subjects/MATH");
  });

  test("refuses to delete a subject referenced by a course or class", async () => {
    mocks.assertDeletionAllowed.mockRejectedValueOnce(new Error("DELETION_BLOCKED"));

    await expect(deleteSubject("MATH")).rejects.toThrow("DELETION_BLOCKED");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });
});
