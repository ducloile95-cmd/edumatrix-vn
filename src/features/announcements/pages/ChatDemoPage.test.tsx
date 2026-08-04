// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import ChatDemoPage from "@/features/announcements/pages/ChatDemoPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children, open, title }: { children: ReactNode; open: boolean; title: string }) => open ? <section aria-label={title}>{children}</section> : null,
}));

describe("ChatDemoPage", () => {
  afterEach(cleanup);

  test("renders a local-only inbox without a send-log section", () => {
    renderWithQueryClient(<ChatDemoPage />);

    expect(screen.getByText("Bản xem trước giao diện Chat mới")).toBeTruthy();
    expect(screen.getByLabelText("Danh sách hội thoại")).toBeTruthy();
    expect(screen.queryByText("Nhật ký gửi")).toBeNull();
  });

  test("shows the official Zalo OA direction", () => {
    renderWithQueryClient(<ChatDemoPage />);

    fireEvent.click(screen.getByRole("button", { name: /Zalo OA/ }));
    expect(screen.getByLabelText("Phạm vi kết nối Zalo")).toBeTruthy();
    expect(screen.getByText(/Không tự động hóa tài khoản Zalo cá nhân/)).toBeTruthy();
  });

  test("sends only into local demo state", () => {
    renderWithQueryClient(<ChatDemoPage />);

    const composer = screen.getByLabelText("Soạn tin nhắn");
    fireEvent.change(composer, { target: { value: "Tin nhắn demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn demo" }));
    expect(screen.getByText("Tin nhắn demo")).toBeTruthy();
    expect(composer).toHaveProperty("value", "");
  });
});
