// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ChatPage from "@/features/announcements/pages/ChatPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  listChatThreads: vi.fn(),
  listMessageOutbox: vi.fn(),
  listStudents: vi.fn(),
  sendMessenger: vi.fn(),
  subscribeChatMessages: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    firebaseUser: { uid: "teacher-1" },
    userDoc: { role: "teacher" },
  }),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/services/firestore/chat", () => ({
  listChatThreads: serviceMocks.listChatThreads,
  listMessageOutbox: serviceMocks.listMessageOutbox,
  subscribeChatMessages: serviceMocks.subscribeChatMessages,
}));

vi.mock("@/services/firestore/students", () => ({
  listStudents: serviceMocks.listStudents,
}));

vi.mock("@/services/integrations/messenger", () => {
  class MessengerSendError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }

  return {
    createMessengerInviteLink: vi.fn(),
    isMessengerInviteConfigured: () => false,
    linkMessengerConversation: vi.fn(),
    MessengerSendError,
    messengerPageUrl: () => null,
    sendMessenger: serviceMocks.sendMessenger,
  };
});

const thread = {
  id: "thread-1",
  parentName: "Phụ huynh An",
  parentUid: "parent-1",
  facebookName: "Facebook An",
  facebookAvatarUrl: null,
  studentId: "student-1",
  studentName: "Nguyễn An",
  className: "Lớp A1",
  linkStatus: "linked",
  messengerPsid: "psid-1",
  lastMessageAt: null,
  lastMessagePreview: "Xin chào",
  unreadStaffCount: 0,
};

describe("ChatPage messaging", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/app/chat");
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "https://worker.example");
    serviceMocks.listChatThreads.mockResolvedValue([thread]);
    serviceMocks.listMessageOutbox.mockResolvedValue([]);
    serviceMocks.listStudents.mockResolvedValue([]);
    serviceMocks.subscribeChatMessages.mockImplementation(
      (_threadId, onItems) => {
        onItems([]);
        return vi.fn();
      },
    );
    serviceMocks.sendMessenger.mockResolvedValue({
      sent: true,
      status: "sent",
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  test("sends a trimmed message from an existing conversation", async () => {
    renderWithQueryClient(<ChatPage />);
    const composer = await screen.findByLabelText("Soạn tin nhắn");
    fireEvent.change(composer, { target: { value: "  Chào phụ huynh  " } });
    fireEvent.click(
      screen.getByRole("button", { name: "Gửi tin nhắn" }),
    );

    await waitFor(() => {
      expect(serviceMocks.sendMessenger).toHaveBeenCalledWith({
        studentId: "student-1",
        recipientPsid: undefined,
        text: "Chào phụ huynh",
        type: "manual",
        tag: undefined,
      });
      expect(screen.getByText("Đã gửi thành công.")).toBeTruthy();
    });
    expect(composer).toHaveProperty("value", "");
  });

  test("shows the Messenger error and keeps the draft for retry", async () => {
    serviceMocks.sendMessenger.mockRejectedValueOnce(
      new Error("Meta unavailable"),
    );
    renderWithQueryClient(<ChatPage />);
    const composer = await screen.findByLabelText("Soạn tin nhắn");
    fireEvent.change(composer, { target: { value: "Gửi lại sau" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Gửi tin nhắn" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Meta unavailable",
      );
    });
    expect(composer).toHaveProperty("value", "Gửi lại sau");
  });

  test("locks the composer when the Messenger Worker is not configured", async () => {
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "");
    renderWithQueryClient(<ChatPage />);

    const composer = await screen.findByLabelText("Soạn tin nhắn");
    expect(composer).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "Gửi tin nhắn" }),
    ).toHaveProperty("disabled", true);
    expect(screen.getByText(/Composer đang bị khóa/)).toBeTruthy();
    expect(serviceMocks.sendMessenger).not.toHaveBeenCalled();
  });
});
