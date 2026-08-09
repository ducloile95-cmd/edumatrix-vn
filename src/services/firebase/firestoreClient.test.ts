import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectFirestoreEmulator: vi.fn(),
  initializeFirestore: vi.fn(() => ({ kind: "firestore" })),
  memoryLocalCache: vi.fn(() => ({ kind: "memory" })),
  firebaseApp: { name: "edumatrix" },
}));

vi.mock("firebase/firestore", () => ({
  connectFirestoreEmulator: mocks.connectFirestoreEmulator,
  initializeFirestore: mocks.initializeFirestore,
  memoryLocalCache: mocks.memoryLocalCache,
}));

vi.mock("@/services/firebase/app", () => ({ firebaseApp: mocks.firebaseApp }));

describe("firestoreClient", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.connectFirestoreEmulator.mockClear();
    mocks.initializeFirestore.mockClear();
    mocks.memoryLocalCache.mockClear();
  });

  it("uses the in-memory cache so a stale single-tab lease cannot block reads", async () => {
    await import("@/services/firebase/firestoreClient");

    expect(mocks.initializeFirestore).toHaveBeenCalledOnce();
    expect(mocks.initializeFirestore).toHaveBeenCalledWith(mocks.firebaseApp, {
      localCache: { kind: "memory" },
    });
  });
});
