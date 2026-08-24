// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Topbar } from "@/components/layouts/Topbar";

const authState = vi.hoisted(() => ({
  role: "teacher" as "admin" | "teacher" | "viewer",
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    role: authState.role,
    isStaff: authState.role !== "viewer",
    firebaseUser: null,
    userDoc: { role: authState.role, studentIds: [], notificationPrefs: {} },
  }),
}));

vi.mock("@/services/firestore/announcements", () => ({ listAnnouncementsByStudents: vi.fn(async () => []) }));
vi.mock("@/services/firestore/chat", () => ({ subscribeChatThreads: vi.fn(() => () => undefined) }));
vi.mock("@/utils/notificationSound", () => ({ playNotificationSound: vi.fn(), unlockNotificationSound: vi.fn() }));

function renderTopbar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[authState.role === "viewer" ? "/portal" : "/app"]}>
        <Topbar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Topbar role-aware guide link", () => {
  test("opens the Teacher guide for a Teacher account", () => {
    authState.role = "teacher";
    renderTopbar();

    const link = screen.getByRole("link", { name: "Hướng dẫn sử dụng cho Teacher (mở tab mới)" });
    expect(link.getAttribute("href")).toBe("/huong-dan?role=teacher");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  test("opens only the parent guide for a Viewer account", () => {
    authState.role = "viewer";
    renderTopbar();

    expect(screen.getByRole("link", { name: "Hướng dẫn sử dụng cho Phụ huynh (mở tab mới)" }).getAttribute("href")).toBe("/huong-dan?role=parent");
    expect(screen.queryByRole("link", { name: /Teacher/ })).toBeNull();
  });

  test("does not guess a guide for Admin before an Admin guide exists", () => {
    authState.role = "admin";
    renderTopbar();

    expect(screen.queryByRole("link", { name: /Hướng dẫn sử dụng/ })).toBeNull();
  });
});
