import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  documentId: vi.fn(() => "__name__"), getDocs: vi.fn(), orderBy: vi.fn(),
  getCurrentUserDoc: vi.fn(), isAdminUser: vi.fn(), isTeacherUser: vi.fn(), where: vi.fn(),
  runTransaction: vi.fn(), transactionDelete: vi.fn(), transactionGet: vi.fn(), transactionUpdate: vi.fn(), writeAuditLog: vi.fn(),
  assertDeletionAllowed: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), documentId: mocks.documentId, getDoc: vi.fn(), getDocs: mocks.getDocs, limit: vi.fn(), onSnapshot: vi.fn(),
  orderBy: mocks.orderBy, query: vi.fn(), where: mocks.where, updateDoc: vi.fn(), writeBatch: vi.fn(),
  doc: vi.fn((_db, name: string, id: string) => ({ id, path: `${name}/${id}` })),
  runTransaction: mocks.runTransaction, serverTimestamp: vi.fn(() => "server-time"),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/auditLog", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("@/services/firestore/deletionDependencies", () => ({ assertDeletionAllowed: mocks.assertDeletionAllowed }));
vi.mock("@/services/firestore/authz", () => ({
  getCurrentUserDoc: mocks.getCurrentUserDoc,
  isAdminUser: mocks.isAdminUser,
  isTeacherUser: mocks.isTeacherUser,
}));

import { deleteUserAccount, listTeacherVisibleUsers, listUsers, listUsersByRole, updateUserAccount } from "./users";

function snapshot(id: string, data: Record<string, unknown> | null) {
  return { id, ref: { id, path: `students/${id}` }, exists: () => data !== null, data: () => data };
}

describe("updateUserAccount", () => {
  beforeEach(() => {
    mocks.assertDeletionAllowed.mockReset().mockResolvedValue(undefined);
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

describe("deleteUserAccount", () => {
  beforeEach(() => {
    mocks.transactionDelete.mockReset(); mocks.transactionGet.mockReset(); mocks.transactionUpdate.mockReset();
    mocks.writeAuditLog.mockReset().mockResolvedValue(undefined);
    mocks.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      delete: mocks.transactionDelete, get: mocks.transactionGet, update: mocks.transactionUpdate,
    }));
  });

  test("hard deletes only an unreferenced account", async () => {
    mocks.transactionGet.mockResolvedValueOnce(snapshot("parent-1", { email: "parent@example.com", role: "viewer", studentIds: [] }));

    await deleteUserAccount({ uid: "admin-1" } as never, "parent-1");

    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
    expect(mocks.transactionDelete).toHaveBeenCalledWith(expect.objectContaining({ path: "users/parent-1" }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.anything(), "user_account_deleted", "user", "parent-1",
      expect.objectContaining({ email: "parent@example.com", role: "viewer" }),
    );
  });

  test("does not allow an admin to delete the signed-in account", async () => {
    await expect(deleteUserAccount({ uid: "admin-1" } as never, "admin-1"))
      .rejects.toThrow("USER_SELF_DELETE_NOT_ALLOWED");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  test("does not delete an account that is still assigned", async () => {
    mocks.assertDeletionAllowed.mockRejectedValueOnce(new Error("DELETION_BLOCKED"));
    await expect(deleteUserAccount({ uid: "admin-1" } as never, "teacher-1"))
      .rejects.toThrow("DELETION_BLOCKED");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });
});

describe("user list queries", () => {
  beforeEach(() => {
    mocks.documentId.mockClear(); mocks.getDocs.mockReset(); mocks.orderBy.mockClear(); mocks.where.mockClear();
    mocks.getCurrentUserDoc.mockReset(); mocks.isAdminUser.mockReset(); mocks.isTeacherUser.mockReset();
  });

  test("uses the single-field createdAt index for stable pagination", async () => {
    mocks.getDocs.mockResolvedValueOnce({ docs: [] });

    await listUsers();

    expect(mocks.orderBy).toHaveBeenCalledTimes(1);
    expect(mocks.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mocks.documentId).not.toHaveBeenCalled();
  });

  test("lists active users by role without requiring a __name__ composite index", async () => {
    mocks.getCurrentUserDoc.mockResolvedValueOnce({ uid: "admin-1", role: "admin" });
    mocks.isAdminUser.mockReturnValueOnce(true);
    mocks.isTeacherUser.mockReturnValue(false);
    mocks.getDocs.mockResolvedValueOnce({ docs: [] });

    await listUsersByRole("teacher");

    expect(mocks.where).toHaveBeenCalledWith("role", "==", "teacher");
    expect(mocks.where).toHaveBeenCalledWith("status", "==", "active");
    expect(mocks.documentId).not.toHaveBeenCalled();
  });
});

describe("listTeacherVisibleUsers", () => {
  const user = (uid: string, role: string) => ({ id: uid, data: () => ({ email: `${uid}@x.vn`, displayName: uid, role, status: "active", studentIds: [] }) });
  beforeEach(() => { mocks.getDocs.mockReset(); mocks.where.mockClear(); mocks.orderBy.mockClear(); });

  test("returns the staff directory plus the given parents, without a full users scan", async () => {
    mocks.getDocs
      .mockResolvedValueOnce({ docs: [user("admin-1", "admin"), user("teacher-1", "teacher")] })
      .mockResolvedValueOnce({ docs: [user("parent-1", "viewer"), user("teacher-1", "teacher")] });

    const result = await listTeacherVisibleUsers(["parent-1", "teacher-1", "parent-1"]);

    expect(mocks.where).toHaveBeenCalledWith("role", "in", ["admin", "teacher"]);
    expect(mocks.orderBy).not.toHaveBeenCalled();
    expect(result.map((item) => item.uid).sort()).toEqual(["admin-1", "parent-1", "teacher-1"]);
  });
});
