import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchUpdate: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  arrayRemove: vi.fn((value) => ({ remove: value })),
  collection: vi.fn((_db, name: string) => name),
  deleteDoc: mocks.deleteDoc,
  doc: vi.fn((_db, name: string, id: string) => `${name}/${id}`),
  documentId: vi.fn(() => "__name__"),
  getDocs: mocks.getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((...values) => ({ orderBy: values })),
  query: vi.fn((...values) => values),
  serverTimestamp: vi.fn(() => "server-time"),
  startAfter: vi.fn((value) => ({ startAfter: value })),
  updateDoc: mocks.updateDoc,
  where: vi.fn((...values) => ({ where: values })),
  writeBatch: mocks.writeBatch,
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { deleteChatTag, listChatThreads, markChatThreadRead, setChatThreadTags } from "@/services/firestore/chat";

describe("chat tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({ update: mocks.batchUpdate, commit: mocks.batchCommit });
  });

  test("removes a deleted tag from every matching thread before deleting it", async () => {
    const firstPage = Array.from({ length: 499 }, (_, index) => ({ ref: `thread-${index}` }));
    mocks.getDocs
      .mockResolvedValueOnce({ empty: false, docs: firstPage })
      .mockResolvedValueOnce({ empty: false, docs: [{ ref: "thread-499" }] })
      .mockResolvedValueOnce({ empty: true, docs: [] });

    await deleteChatTag("tag-1");

    expect(mocks.batchUpdate).toHaveBeenCalledTimes(500);
    expect(mocks.batchCommit).toHaveBeenCalledTimes(2);
    expect(mocks.deleteDoc).toHaveBeenCalledWith("chat_tags/tag-1");
  });

  test("rejects a thread tag set when one referenced tag does not exist", async () => {
    mocks.getDocs.mockResolvedValueOnce({ size: 1 });

    await expect(setChatThreadTags("thread-1", ["tag-1", "tag-missing"]))
      .rejects.toThrow("CHAT_TAG_NOT_FOUND");
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  test("deduplicates valid tags before updating the thread", async () => {
    mocks.getDocs.mockResolvedValueOnce({ size: 2 });

    await setChatThreadTags("thread-1", ["tag-1", "tag-1", "tag-2"]);

    expect(mocks.updateDoc).toHaveBeenCalledWith("chat_threads/thread-1", {
      tagIds: ["tag-1", "tag-2"],
      updatedAt: "server-time",
    });
  });

  test("marks a conversation as read without changing its messages", async () => {
    await markChatThreadRead("thread-1");

    expect(mocks.updateDoc).toHaveBeenCalledWith("chat_threads/thread-1", {
      unreadStaffCount: 0,
      updatedAt: "server-time",
    });
  });

  test("loads every chat thread instead of hiding conversations after the first 30", async () => {
    const page = (offset: number, count: number) => ({
      docs: Array.from({ length: count }, (_, index) => ({
        id: `thread-${offset + index}`,
        data: () => ({ parentName: `Parent ${offset + index}` }),
      })),
    });
    mocks.getDocs.mockResolvedValueOnce(page(0, 30)).mockResolvedValueOnce(page(30, 1));

    const result = await listChatThreads("admin", "admin-1");

    expect(result).toHaveLength(31);
    expect(mocks.getDocs).toHaveBeenCalledTimes(2);
  });
});
