// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Topbar } from "@/components/layouts/Topbar";

const authState = vi.hoisted(() => ({
  role: "teacher" as "admin" | "teacher" | "viewer",
  firebaseUser: null as { uid: string } | null,
}));

const chatState = vi.hoisted(() => ({
  listener: null as null | ((items: unknown[]) => void),
  subscribeChatThreads: vi.fn(),
}));

const soundMocks = vi.hoisted(() => ({
  playNotificationSound: vi.fn(),
  unlockNotificationSound: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    role: authState.role,
    isStaff: authState.role !== "viewer",
    firebaseUser: authState.firebaseUser,
    userDoc: { role: authState.role, studentIds: [], notificationPrefs: {} },
  }),
}));

vi.mock("@/services/firestore/announcements", () => ({ listAnnouncementsByStudents: vi.fn(async () => []) }));
vi.mock("@/services/firestore/chat", () => ({
  markChatThreadRead: vi.fn(),
  subscribeChatThreads: chatState.subscribeChatThreads.mockImplementation((_role, _uid, listener) => {
    chatState.listener = listener;
    return () => undefined;
  }),
}));
vi.mock("@/utils/notificationSound", () => soundMocks);

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
  authState.firebaseUser = null;
  chatState.listener = null;
});

describe("Topbar role-aware guide link", () => {
  test("opens the Teacher guide for a Teacher account", () => {
    authState.role = "teacher";
    renderTopbar();

    const link = screen.getByRole("link", { name: "Hướng dẫn sử dụng cho Giáo viên (mở tab mới)" });
    expect(link.getAttribute("href")).toBe("/huong-dan?role=teacher");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  test("opens only the parent guide for a Viewer account", () => {
    authState.role = "viewer";
    renderTopbar();

    expect(screen.getByRole("link", { name: "Hướng dẫn sử dụng cho Phụ huynh (mở tab mới)" }).getAttribute("href")).toBe("/huong-dan?role=parent");
    expect(screen.queryByRole("link", { name: /Giáo viên/ })).toBeNull();
  });

  test("does not guess a guide for Admin before an Admin guide exists", () => {
    authState.role = "admin";
    renderTopbar();

    expect(screen.queryByRole("link", { name: /Hướng dẫn sử dụng/ })).toBeNull();
  });

  test("plays a sound when an unread conversation receives another message", async () => {
    authState.role = "teacher";
    authState.firebaseUser = { uid: "teacher-1" };
    renderTopbar();

    await waitFor(() => expect(chatState.listener).not.toBeNull());
    act(() => chatState.listener?.([{
      id: "thread-1", parentName: "Phụ huynh", lastMessagePreview: "Tin nhắn",
      lastMessageAt: { toDate: () => new Date(1_000), toMillis: () => 1_000 }, unreadStaffCount: 1,
    }]));
    expect(soundMocks.playNotificationSound).not.toHaveBeenCalled();

    act(() => chatState.listener?.([{
      id: "thread-1", parentName: "Phụ huynh", lastMessagePreview: "Tin nhắn",
      lastMessageAt: { toDate: () => new Date(2_000), toMillis: () => 2_000 }, unreadStaffCount: 2,
    }]));

    await waitFor(() => expect(soundMocks.playNotificationSound).toHaveBeenCalledTimes(1));
  });
});
