import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), getDocs: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(), query: vi.fn(),
  doc: vi.fn((_db, name: string, id: string) => ({ id, path: `${name}/${id}` })),
  runTransaction: mocks.runTransaction,
  serverTimestamp: vi.fn(() => "server-time"), setDoc: vi.fn(), updateDoc: vi.fn(), where: vi.fn(),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/auditLog", () => ({ writeAuditLog: mocks.writeAuditLog }));

import { approveLinkRequest } from "./linkRequests";

function snapshot(id: string, data: Record<string, unknown> | null) {
  return { id, ref: { id, path: id }, exists: () => data !== null, data: () => data };
}

const requestData = {
  id: "parent-1", email: "parent@example.com", parentName: "Parent", phone: "0900000000",
  relationship: "parent", children: [{ fullName: "Student", dateOfBirth: "2015-01-01" }], status: "pending",
};
const request = requestData as never;

describe("approveLinkRequest", () => {
  beforeEach(() => {
    mocks.transactionGet.mockReset(); mocks.transactionSet.mockReset(); mocks.transactionUpdate.mockReset();
    mocks.writeAuditLog.mockReset().mockResolvedValue(undefined);
    mocks.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: mocks.transactionGet, set: mocks.transactionSet, update: mocks.transactionUpdate,
    }));
  });

  test("rejects a request already handled by another admin", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("parent-1", { ...requestData, status: "approved" }))
      .mockResolvedValueOnce(snapshot("parent-1", null));

    await expect(approveLinkRequest({ uid: "admin-1" } as never, request, [{ mode: "existing", studentId: "HS001" }]))
      .rejects.toThrow("LINK_REQUEST_ALREADY_REVIEWED");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });

  test("preserves an existing viewer and unions student links", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("parent-1", request))
      .mockResolvedValueOnce(snapshot("parent-1", { role: "viewer", studentIds: ["HS000"] }))
      .mockResolvedValueOnce(snapshot("HS001", { parentUids: [] }));

    await approveLinkRequest({ uid: "admin-1" } as never, request, [{ mode: "existing", studentId: "HS001" }]);

    expect(mocks.transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: "users/parent-1" }), expect.objectContaining({
      studentIds: ["HS000", "HS001"],
    }));
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });
});
