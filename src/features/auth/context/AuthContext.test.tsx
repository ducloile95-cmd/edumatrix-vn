// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

const mocks = vi.hoisted(() => ({
  authObserver: null as null | ((user: unknown) => void),
  snapshotError: null as null | ((error: Error) => void),
  onSnapshot: vi.fn(),
  setCachedUserDoc: vi.fn(),
  attemptClaimInvite: vi.fn(),
}));

vi.mock("@/services/firebase/authClient", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, observer: (user: unknown) => void) => {
    mocks.authObserver = observer;
    return vi.fn();
  }),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: mocks.onSnapshot.mockImplementation(
    (_ref: unknown, _next: unknown, onError: (error: Error) => void) => {
      mocks.snapshotError = onError;
      return vi.fn();
    },
  ),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ setCachedUserDoc: mocks.setCachedUserDoc }));
vi.mock("@/services/firestore/users", () => ({ attemptClaimInvite: mocks.attemptClaimInvite }));

afterEach(cleanup);

function AuthProbe() {
  const { loading, profileError } = useAuth();
  return <p>{loading ? "loading" : profileError ? "profile-error" : "ready"}</p>;
}

describe("AuthProvider profile failures", () => {
  beforeEach(() => {
    mocks.authObserver = null;
    mocks.snapshotError = null;
    mocks.onSnapshot.mockClear();
    mocks.setCachedUserDoc.mockClear();
    mocks.attemptClaimInvite.mockClear();
  });

  it("keeps a Firestore profile error separate from a missing profile", async () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>);

    await waitFor(() => expect(mocks.authObserver).not.toBeNull());
    await act(async () => {
      mocks.authObserver?.({ uid: "user-1" });
    });
    await waitFor(() => expect(mocks.onSnapshot).toHaveBeenCalledOnce());

    act(() => {
      mocks.snapshotError?.(new Error("permission-denied"));
    });

    expect(await screen.findByText("profile-error")).toBeTruthy();
    expect(mocks.setCachedUserDoc).toHaveBeenCalledWith(null);
    expect(mocks.attemptClaimInvite).not.toHaveBeenCalled();
  });
});
