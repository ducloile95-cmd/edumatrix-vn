// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ChatPage from "@/features/announcements/pages/ChatPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  authRole: "teacher" as "admin" | "teacher",
  listChatThreads: vi.fn(),
  listChatTags: vi.fn(),
  createChatTag: vi.fn(),
  deleteChatTag: vi.fn(),
  setChatThreadTags: vi.fn(),
  markChatThreadRead: vi.fn(),
  listStudents: vi.fn(),
  listUsersByIds: vi.fn(),
  sendMessenger: vi.fn(),
  deleteMessengerConversation: vi.fn(),
  syncMessengerThreadContexts: vi.fn(),
  subscribeChatMessages: vi.fn(),
  subscribeChatThreads: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    firebaseUser: { uid: "teacher-1" },
    userDoc: { role: serviceMocks.authRole },
  }),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/services/firestore/chat", () => ({
  listChatThreads: serviceMocks.listChatThreads,
  listChatTags: serviceMocks.listChatTags,
  createChatTag: serviceMocks.createChatTag,
  deleteChatTag: serviceMocks.deleteChatTag,
  setChatThreadTags: serviceMocks.setChatThreadTags,
  markChatThreadRead: serviceMocks.markChatThreadRead,
  subscribeChatMessages: serviceMocks.subscribeChatMessages,
  subscribeChatThreads: serviceMocks.subscribeChatThreads,
}));

vi.mock("@/services/firestore/students", () => ({
  listStudents: serviceMocks.listStudents,
}));

vi.mock("@/services/firestore/users", () => ({
  listUsersByIds: serviceMocks.listUsersByIds,
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
    getUtilityDeliveryStatus: vi.fn().mockResolvedValue({ jobs: [], events: [] }),
    isMessengerInviteConfigured: () => false,
    linkMessengerConversation: vi.fn(),
    MessengerSendError,
    deleteMessengerConversation: serviceMocks.deleteMessengerConversation,
    messengerPageUrl: () => null,
    sendMessenger: serviceMocks.sendMessenger,
    retryUtilityDeliveryJob: vi.fn(),
    summarizeUtilityDelivery: () => ({ status: "none", detail: "", retryableJobIds: [] }),
    utilityDeliveryRefetchInterval: () => false,
    syncMessengerThreadContexts: serviceMocks.syncMessengerThreadContexts,
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
  responseWindowEndsAt: { toDate: () => new Date(Date.now() + 60_000) },
};

describe("ChatPage messaging", () => {
  beforeEach(() => {
    serviceMocks.authRole = "teacher";
    window.history.replaceState({}, "", "/app/chat");
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "https://worker.example");
    serviceMocks.listChatThreads.mockResolvedValue([thread]);
    serviceMocks.listChatTags.mockResolvedValue([]);
    serviceMocks.createChatTag.mockResolvedValue(undefined);
    serviceMocks.deleteChatTag.mockResolvedValue(undefined);
    serviceMocks.setChatThreadTags.mockResolvedValue(undefined);
    serviceMocks.markChatThreadRead.mockResolvedValue(undefined);
    serviceMocks.listStudents.mockResolvedValue([]);
    serviceMocks.listUsersByIds.mockResolvedValue([{ uid: "parent-1", displayName: "Phụ huynh An", email: "phuhuynhan@example.com", phone: "0901234567" }]);
    serviceMocks.subscribeChatMessages.mockImplementation(
      (_threadId, onItems) => {
        onItems([]);
        return vi.fn();
      },
    );
    serviceMocks.subscribeChatThreads.mockReturnValue(vi.fn());
    serviceMocks.sendMessenger.mockResolvedValue({
      sent: true,
      status: "sent",
    });
    serviceMocks.deleteMessengerConversation.mockResolvedValue(2);
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

  test("does not load the hidden send log", async () => {
    renderWithQueryClient(<ChatPage />);

    await screen.findByLabelText("Soạn tin nhắn");
    expect(screen.queryByText("Nhật ký gửi")).toBeNull();
  });

  test("persists a Composer tag assignment to Firestore", async () => {
    serviceMocks.listChatTags.mockResolvedValue([{ id: "tag-green", label: "Đã mua", color: "green", createdBy: "admin-1", createdAt: null, updatedAt: null }]);
    renderWithQueryClient(<ChatPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Gắn tag Đã mua" }));

    await waitFor(() => expect(serviceMocks.setChatThreadTags).toHaveBeenCalledWith("thread-1", ["tag-green"]));
  });

  test("uses the final demo hierarchy and removes Zalo", async () => {
    renderWithQueryClient(<ChatPage />);

    const composer = await screen.findByLabelText("Soạn tin nhắn");
    expect(composer.getAttribute("placeholder")).toBe("Aa");
    expect(screen.queryByText("Zalo cá nhân")).toBeNull();
    expect(within(screen.getByLabelText("Danh sách hội thoại")).queryByText("Nguyễn An")).toBeNull();
    expect(within(screen.getByLabelText("Hội thoại với Facebook An")).queryByText("Nguyễn An")).toBeNull();
    expect(screen.getByText("Thông tin phụ huynh")).toBeTruthy();
    expect(await screen.findByText("phuhuynhan@example.com")).toBeTruthy();
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

  test("locks free text after 24 hours until a valid message tag is selected", async () => {
    serviceMocks.listChatThreads.mockResolvedValue([{
      ...thread,
      responseWindowEndsAt: { toDate: () => new Date(Date.now() - 60_000) },
    }]);
    renderWithQueryClient(<ChatPage />);

    const composer = await screen.findByLabelText("Soạn tin nhắn");
    expect(composer).toHaveProperty("disabled", true);
    expect(screen.getByText(/Cửa sổ phản hồi 24 giờ đã hết/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("ACCOUNT_UPDATE"), { target: { value: "ACCOUNT_UPDATE" } });
    await waitFor(() => expect(composer).toHaveProperty("disabled", false));
  });

  test("lets an admin confirm and delete a conversation", async () => {
    serviceMocks.authRole = "admin";
    renderWithQueryClient(<ChatPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Xóa cuộc hội thoại" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa hội thoại" }));

    await waitFor(() => expect(serviceMocks.deleteMessengerConversation).toHaveBeenCalledWith("thread-1"));
    expect(screen.queryByLabelText("Soạn tin nhắn")).toBeNull();
  });

  test("marks an unread conversation as read when staff opens it", async () => {
    serviceMocks.listChatThreads.mockResolvedValue([{ ...thread, unreadStaffCount: 3 }]);
    renderWithQueryClient(<ChatPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Facebook An/ }));

    await waitFor(() => expect(serviceMocks.markChatThreadRead).toHaveBeenCalledWith("thread-1"));
    expect(screen.queryByText("3")).toBeNull();
  });

  test("uses the full conversation width and keeps tag settings outside the tag scroll rail", async () => {
    serviceMocks.authRole = "admin";
    serviceMocks.listChatTags.mockResolvedValue([{ id: "tag-green", label: "Học viên mới", color: "green", createdBy: "admin-1", createdAt: null, updatedAt: null }]);
    renderWithQueryClient(<ChatPage />);

    const composer = await screen.findByRole("form", { name: "Trình soạn tin nhắn" });
    const tagBar = screen.getByLabelText("Tag mẫu trên Composer");
    const scrollRail = within(tagBar).getByLabelText("Danh sách tag mẫu");
    const settings = within(tagBar).getByRole("button", { name: "Quản lý tag mẫu" });

    expect(composer.firstElementChild?.className).toBe("w-full");
    expect(scrollRail.contains(settings)).toBe(false);
  });
});

describe("ChatPage utility templates", () => {
  const student = { id: "student-1", fullName: "Nguyễn An", studentCode: "HS001", parentUids: ["parent-1"] };

  beforeEach(() => {
    window.history.replaceState({}, "", "/app/chat");
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "https://worker.example");
    vi.stubEnv("VITE_UTILITY_MESSAGING_ENABLED", "true");
    serviceMocks.listChatThreads.mockResolvedValue([]);
    serviceMocks.listChatTags.mockResolvedValue([]);
    serviceMocks.createChatTag.mockResolvedValue(undefined);
    serviceMocks.deleteChatTag.mockResolvedValue(undefined);
    serviceMocks.setChatThreadTags.mockResolvedValue(undefined);
    serviceMocks.listStudents.mockResolvedValue([student]);
    serviceMocks.listUsersByIds.mockResolvedValue([]);
    serviceMocks.subscribeChatMessages.mockImplementation((_id, onItems) => { onItems([]); return vi.fn(); });
    serviceMocks.sendMessenger.mockResolvedValue({ sent: true, status: "sent" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  async function openUtilityComposer() {
    renderWithQueryClient(<ChatPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Nhắn mới/ }));
    const mode = await screen.findByLabelText(/Cách gửi/);
    fireEvent.change(mode, { target: { value: "utility" } });
    return screen.getByRole("button", { name: "Gửi tin nhắn" }) as HTMLButtonElement;
  }

  test("che do utility bo o nhap noi dung, hien dung tham so cua mau", async () => {
    await openUtilityComposer();

    // Mau mac dinh la nhac hoc phi: 4 tham so, khong co "Tên trung tâm" (V2 da bo).
    await screen.findByLabelText("Kỳ học phí");
    expect(screen.getByLabelText("Số tiền")).toBeTruthy();
    expect(screen.getByLabelText("Hạn thanh toán")).toBeTruthy();
    expect(screen.queryByLabelText("Tên trung tâm")).toBeNull();
    expect(screen.queryByPlaceholderText("Nhập nội dung tin nhắn...")).toBeNull();
  });

  test("nut Gui mau mo picker voi dung template dang chon", async () => {
    renderWithQueryClient(<ChatPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Mẫu tiện ích" }));
    const useTemplate = await screen.findByRole("button", { name: "Gửi mẫu" }) as HTMLButtonElement;
    expect(useTemplate.disabled).toBe(false);
    fireEvent.click(useTemplate);

    await screen.findByLabelText(/Cách gửi/);
    expect((screen.getByLabelText(/Cách gửi/) as HTMLSelectElement).value).toBe("utility");
    expect(screen.getByLabelText("Kỳ học phí")).toBeTruthy();
  });

  test("nut gui bi khoa cho toi khi dien du moi tham so", async () => {
    const button = await openUtilityComposer();
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Tên học sinh"), { target: { value: "Nguyễn An" } });
    fireEvent.change(screen.getByLabelText("Kỳ học phí"), { target: { value: "Tháng 8/2026" } });
    fireEvent.change(screen.getByLabelText("Số tiền"), { target: { value: "2.000.000 đ" } });
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Hạn thanh toán"), { target: { value: "2026-08-05" } });
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  test("gui dung templateKey va parameters theo thu tu registry cua Worker", async () => {
    const button = await openUtilityComposer();
    fireEvent.change(screen.getByLabelText("Tên học sinh"), { target: { value: "  Nguyễn An  " } });
    fireEvent.change(screen.getByLabelText("Kỳ học phí"), { target: { value: "Tháng 8/2026" } });
    fireEvent.change(screen.getByLabelText("Số tiền"), { target: { value: "2.000.000 đ" } });
    fireEvent.change(screen.getByLabelText("Hạn thanh toán"), { target: { value: "2026-08-05" } });
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);

    await waitFor(() => expect(serviceMocks.sendMessenger).toHaveBeenCalledTimes(1));
    const payload = serviceMocks.sendMessenger.mock.calls[0][0];
    expect(payload.deliveryMode).toBe("utility");
    expect(payload.templateKey).toBe("tuition_payment_reminder");
    expect(payload.text).toBeUndefined();
    // Thu tu tham so phai khop registry Worker, va gia tri phai duoc trim.
    expect(Object.keys(payload.parameters)).toEqual(["studentName", "billingPeriod", "amount", "dueDate"]);
    expect(payload.parameters.studentName).toBe("Nguyễn An");
  });
});
