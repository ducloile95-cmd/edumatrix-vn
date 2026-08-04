// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BottomNavigation } from "@/components/layouts/BottomNavigation";

const authState = vi.hoisted(() => ({
  role: "admin" as "admin" | "teacher" | "viewer",
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    role: authState.role,
    isStaff: authState.role !== "viewer",
  }),
}));

vi.mock("@/app/routePrefetch", () => ({
  prefetchRoute: vi.fn(),
}));

function renderNavigation(pathname: string, onMoreClick = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <BottomNavigation onMoreClick={onMoreClick} />
    </MemoryRouter>,
  );
  return onMoreClick;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BottomNavigation", () => {
  test("shows Admin priorities and opens the full menu", () => {
    authState.role = "admin";
    const onMoreClick = renderNavigation("/app/dashboard");

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Tổng quan",
      "Học sinh",
      "Lớp học",
      "Tài chính",
    ]);
    expect(screen.getByRole("link", { name: "Tổng quan" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Mở thêm chức năng" }));
    expect(onMoreClick).toHaveBeenCalledOnce();
  });

  test("shows Teacher priorities", () => {
    authState.role = "teacher";
    renderNavigation("/app/attendance");

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Tổng quan",
      "Lịch dạy",
      "Điểm danh",
      "Lớp học",
    ]);
    expect(screen.getByRole("link", { name: "Điểm danh" }).getAttribute("aria-current")).toBe("page");
  });

  test("keeps the five Viewer destinations without a More button", () => {
    authState.role = "viewer";
    renderNavigation("/portal/assignments");

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Tổng quan",
      "Lịch học",
      "Bài tập",
      "Học phí",
      "Thông báo",
    ]);
    expect(screen.queryByRole("button", { name: "Mở thêm chức năng" })).toBeNull();
    expect(screen.getByRole("link", { name: "Bài tập" }).getAttribute("aria-current")).toBe("page");
  });
});
