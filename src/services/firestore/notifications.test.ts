import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  getDocs: vi.fn(),
  listAnnouncementsByStudent: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id: string) => `${name}/${id}`),
  getDocs: mocks.getDocs,
  query: vi.fn((...values) => values),
  serverTimestamp: vi.fn(() => "server-time"),
  where: vi.fn((...values) => ({ where: values })),
  writeBatch: mocks.writeBatch,
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/announcements", () => ({
  listAnnouncementsByStudent: mocks.listAnnouncementsByStudent,
}));

import { dismissNotifications, listViewerNotifications, markNotificationsRead } from "@/services/firestore/notifications";

function snapshot(items: { id: string; data: Record<string, unknown> }[]) {
  return { docs: items.map((item) => ({ id: item.id, data: () => item.data })) };
}

describe("viewer notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({ set: mocks.batchSet, commit: mocks.batchCommit });
  });

  test("deduplicates announcements and joins read state for the current user", async () => {
    const first = { id: "announcement-1", title: "One", message: "First", createdAt: { toMillis: () => 2 } };
    mocks.listAnnouncementsByStudent
      .mockResolvedValueOnce([first, { id: "announcement-2", title: "Two", message: "Second", createdAt: { toMillis: () => 1 } }])
      .mockResolvedValueOnce([first]);
    mocks.getDocs.mockResolvedValueOnce(snapshot([
      { id: "viewer-1_announcement-1", data: { announcementId: "announcement-1" } },
    ]));

    const result = await listViewerNotifications("viewer-1", ["student-1", "student-2"]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "announcement-1", isRead: true });
    expect(result[1]).toMatchObject({ id: "announcement-2", isRead: false });
  });

  test("does not return notifications dismissed by the current user", async () => {
    mocks.listAnnouncementsByStudent.mockResolvedValueOnce([
      { id: "announcement-1", title: "One", message: "First", createdAt: { toMillis: () => 1 } },
    ]);
    mocks.getDocs.mockResolvedValueOnce(snapshot([
      { id: "viewer-1_announcement-1", data: { announcementId: "announcement-1", dismissedAt: "server-time" } },
    ]));

    await expect(listViewerNotifications("viewer-1", ["student-1"])).resolves.toEqual([]);
  });

  test("writes read state in one batch with deterministic ids", async () => {
    await markNotificationsRead("viewer-1", ["announcement-1", "announcement-2"]);

    expect(mocks.batchSet).toHaveBeenCalledWith(
      "notification_reads/viewer-1_announcement-1",
      { uid: "viewer-1", announcementId: "announcement-1", readAt: "server-time" },
      { merge: true },
    );
    expect(mocks.batchSet).toHaveBeenCalledTimes(2);
    expect(mocks.batchCommit).toHaveBeenCalledTimes(1);
  });

  test("splits large read updates to stay within Firestore Rules access limits", async () => {
    await markNotificationsRead(
      "viewer-1",
      Array.from({ length: 11 }, (_, index) => `announcement-${index}`),
    );

    expect(mocks.writeBatch).toHaveBeenCalledTimes(2);
    expect(mocks.batchCommit).toHaveBeenCalledTimes(2);
  });

  test("persists dismiss state so clear all survives reload", async () => {
    await dismissNotifications("viewer-1", ["announcement-1"]);

    expect(mocks.batchSet).toHaveBeenCalledWith(
      "notification_reads/viewer-1_announcement-1",
      { uid: "viewer-1", announcementId: "announcement-1", readAt: "server-time", dismissedAt: "server-time" },
      { merge: true },
    );
  });
});
