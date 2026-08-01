// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "@/app/guards/RequireAuth";

const authState = vi.hoisted(() => ({
  value: {
    loading: false,
    isSignedIn: true,
    userDoc: null,
    profileError: false,
    claiming: false,
  },
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState.value }));

afterEach(cleanup);

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<RequireAuth><p>Nội dung riêng tư</p></RequireAuth>} />
        <Route path="/access-denied" element={<p>Không có quyền</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth profile loading failures", () => {
  beforeEach(() => {
    authState.value = {
      loading: false,
      isSignedIn: true,
      userDoc: null,
      profileError: false,
      claiming: false,
    };
  });

  it("shows a retryable system error instead of access denied", () => {
    authState.value.profileError = true;
    renderGuard();

    expect(screen.getByText("Không thể xác minh tài khoản")).toBeTruthy();
    expect(screen.queryByText("Không có quyền")).toBeNull();
  });

  it("keeps access denied for a successfully resolved missing profile", () => {
    renderGuard();

    expect(screen.getByText("Không có quyền")).toBeTruthy();
  });
});
