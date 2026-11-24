import { beforeEach, describe, expect, test, vi } from "vitest";

const { getDocs, startAfter } = vi.hoisted(() => ({
  getDocs: vi.fn(),
  startAfter: vi.fn((cursor) => ({ cursor })),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  query: vi.fn((...parts) => parts),
  startAfter,
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { listAllQueryDocuments, listQueryDocumentsPage } from "@/services/firestore/pagination";

describe("listAllQueryDocuments", () => {
  beforeEach(() => vi.clearAllMocks());

  test("continues from the last document until a short page", async () => {
    const page = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({ id: `doc-${offset + index}` })),
    });
    getDocs.mockResolvedValueOnce(page(0, 2)).mockResolvedValueOnce(page(2, 1));

    const result = await listAllQueryDocuments("items", [], 2);

    expect(result.map((item) => item.id)).toEqual(["doc-0", "doc-1", "doc-2"]);
    expect(startAfter).toHaveBeenCalledWith(expect.objectContaining({ id: "doc-1" }));
  });

  test("loads exactly one bounded page for dashboard previews", async () => {
    getDocs.mockResolvedValueOnce({ docs: [{ id: "doc-0" }, { id: "doc-1" }] });

    const result = await listQueryDocumentsPage("items", [], 2);

    expect(result.map((item) => item.id)).toEqual(["doc-0", "doc-1"]);
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(startAfter).not.toHaveBeenCalled();
  });
});
