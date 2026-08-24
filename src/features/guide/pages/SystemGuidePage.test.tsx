// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import SystemGuidePage from "@/features/guide/pages/SystemGuidePage";

const authState = vi.hoisted(() => ({
  role: "viewer" as "teacher" | "viewer",
  isSignedIn: true,
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ role: authState.role, isSignedIn: authState.isSignedIn }),
}));

afterEach(() => cleanup());

describe("SystemGuidePage role scope", () => {
  test("locks a signed-in Viewer to parent content even when the URL requests Teacher", async () => {
    authState.role = "viewer";
    authState.isSignedIn = true;
    render(
      <MemoryRouter initialEntries={["/huong-dan?role=teacher"]}>
        <SystemGuidePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Hướng dẫn dành cho Phụ huynh" })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Cổng thông tin phụ huynh" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Nhịp làm việc của Teacher" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Các màn hình Teacher chính" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Teacher" })).toBeNull();
  });

  test("keeps role switching available before login", () => {
    authState.isSignedIn = false;
    render(
      <MemoryRouter initialEntries={["/huong-dan?role=parent"]}>
        <SystemGuidePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("button", { name: "Teacher" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Phụ huynh" }).length).toBeGreaterThan(0);
  });
});
