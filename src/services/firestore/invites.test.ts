import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => ({ path: name })),
  doc: vi.fn((_db, name: string, id: string) => ({ path: `${name}/${id}` })),
  getDocs: mocks.getDocs,
  limit: vi.fn((value: number) => ({ limit: value })),
  orderBy: vi.fn(),
  query: vi.fn((...parts: unknown[]) => parts),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: mocks.setDoc,
  updateDoc: vi.fn(),
  where: vi.fn((...parts: unknown[]) => parts),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/auditLog", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("@/services/firestore/pagination", () => ({ listAllQueryDocuments: vi.fn() }));

import { createInvite } from "./invites";

describe("createInvite", () => {
  beforeEach(() => {
    mocks.getDocs.mockReset();
    mocks.setDoc.mockReset().mockResolvedValue(undefined);
    mocks.writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  test("rejects an email that already has a user profile", async () => {
    mocks.getDocs.mockResolvedValue({ empty: false });

    await expect(createInvite({ uid: "admin-1" } as never, {
      email: " Existing@Example.com ", role: "admin", studentIds: [],
    })).rejects.toThrow("ACCOUNT_ALREADY_EXISTS");

    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  test("creates an invite for a new normalized email", async () => {
    mocks.getDocs.mockResolvedValue({ empty: true });

    await createInvite({ uid: "admin-1" } as never, {
      email: " New@Example.com ", role: "teacher", studentIds: [],
    });

    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "invites/new@example.com" }),
      expect.objectContaining({ email: "new@example.com", role: "teacher", studentIds: [] }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalled();
  });
});
