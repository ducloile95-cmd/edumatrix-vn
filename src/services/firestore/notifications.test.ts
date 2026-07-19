import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchCommit, batchSet, getDocs, writeBatch } = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id: string) => `${name}/${id}`),
  getDocs,
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn((...values) => ({ orderBy: values })),
  query: vi.fn((...values) => values),
  serverTimestamp: vi.fn(() => "server-time"),
  where: vi.fn((...values) => ({ where: values })),
  writeBatch,
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { listViewerNotifications, markNotificationsRead } from "@/services/firestore/notifications";

function snapshot(items: { id: string; data: Record<string, unknown> }[]) {
  return { docs: items.map((item) => ({ id: item.id, data: () => item.data })) };
}

describe("viewer notifications", () => {
  beforeEach(() => {
    getDocs.mockReset();
    batchCommit.mockReset().mockResolvedValue(undefined);
    batchSet.mockReset();
    writeBatch.mockReset().mockReturnValue({ set: batchSet, commit: batchCommit });
  });

  test("deduplicates announcements and joins read state for the current user", async () => {
    getDocs
      .mockResolvedValueOnce(snapshot([
        { id: "announcement-1", data: { title: "Một", createdAt: { toMillis: () => 2 } } },
        { id: "announcement-2", data: { title: "Hai", createdAt: { toMillis: () => 1 } } },
      ]))
      .mockResolvedValueOnce(snapshot([
        { id: "announcement-1", data: { title: "Một", createdAt: { toMillis: () => 2 } } },
      ]))
      .mockResolvedValueOnce(snapshot([
        { id: "viewer-1_announcement-1", data: { announcementId: "announcement-1" } },
      ]));

    const result = await listViewerNotifications("viewer-1", ["student-1", "student-2"]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "announcement-1", isRead: true });
    expect(result[1]).toMatchObject({ id: "announcement-2", isRead: false });
  });

  test("writes read state in one batch with deterministic ids", async () => {
    await markNotificationsRead("viewer-1", ["announcement-1", "announcement-2"]);

    expect(batchSet).toHaveBeenCalledWith(
      "notification_reads/viewer-1_announcement-1",
      { uid: "viewer-1", announcementId: "announcement-1", readAt: "server-time" },
      { merge: true },
    );
    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  test("splits large read updates to stay within Firestore Rules access limits", async () => {
    await markNotificationsRead(
      "viewer-1",
      Array.from({ length: 11 }, (_, index) => `announcement-${index}`),
    );

    expect(writeBatch).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(2);
  });
});
