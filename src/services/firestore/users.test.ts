import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runTransaction: vi.fn(), transactionGet: vi.fn(), transactionUpdate: vi.fn(), writeAuditLog: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), documentId: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(),
  orderBy: vi.fn(), query: vi.fn(), where: vi.fn(), updateDoc: vi.fn(), writeBatch: vi.fn(),
  doc: vi.fn((_db, name: string, id: string) => ({ id, path: `${name}/${id}` })),
  runTransaction: mocks.runTransaction, serverTimestamp: vi.fn(() => "server-time"),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/auditLog", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc: vi.fn(), isAdminUser: vi.fn(), isTeacherUser: vi.fn() }));

import { updateUserAccount } from "./users";

function snapshot(id: string, data: Record<string, unknown> | null) {
  return { id, ref: { id, path: `students/${id}` }, exists: () => data !== null, data: () => data };
}

describe("updateUserAccount", () => {
  beforeEach(() => {
    mocks.transactionGet.mockReset(); mocks.transactionUpdate.mockReset();
    mocks.writeAuditLog.mockReset().mockResolvedValue(undefined);
    mocks.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: mocks.transactionGet, update: mocks.transactionUpdate,
    }));
  });

  test("updates both sides when a parent changes students", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("parent-1", { role: "viewer", studentIds: ["HS001"] }))
      .mockResolvedValueOnce(snapshot("HS001", { parentUids: ["parent-1"] }))
      .mockResolvedValueOnce(snapshot("HS002", { parentUids: [] }));

    await updateUserAccount({ uid: "admin-1" } as never, "parent-1", {
      displayName: "Parent", role: "viewer", status: "active", studentIds: ["HS002"],
    });

    expect(mocks.transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: "students/HS001" }), expect.objectContaining({ parentUids: [] }));
    expect(mocks.transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: "students/HS002" }), expect.objectContaining({ parentUids: ["parent-1"] }));
  });

  test("does not allow staff roles to retain parent links", async () => {
    await expect(updateUserAccount({ uid: "admin-1" } as never, "parent-1", {
      displayName: "Teacher", role: "teacher", status: "active", studentIds: ["HS001"],
    })).rejects.toThrow("NON_VIEWER_CANNOT_LINK_STUDENTS");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  test("promotes a viewer to admin and removes reverse parent links", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("parent-1", { role: "viewer", studentIds: ["HS001"] }))
      .mockResolvedValueOnce(snapshot("HS001", { parentUids: ["parent-1"] }));

    await updateUserAccount({ uid: "admin-1" } as never, "parent-1", {
      displayName: "Administrator", role: "admin", status: "active", studentIds: [],
    });

    expect(mocks.transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/parent-1" }),
      expect.objectContaining({ role: "admin", studentIds: [] }),
    );
    expect(mocks.transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "students/HS001" }),
      expect.objectContaining({ parentUids: [] }),
    );
  });
});
