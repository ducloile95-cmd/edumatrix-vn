// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
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

    expect(screen.getByText("Đoạn chat")).toBeTruthy();
    expect(screen.getByLabelText("Danh sách hội thoại")).toBeTruthy();
    expect(screen.queryByText("Nhật ký gửi")).toBeNull();
  });

  test("removes the Zalo tab from the demo", () => {
    renderWithQueryClient(<ChatDemoPage />);

    expect(screen.queryByText(/Zalo/i)).toBeNull();
    expect(screen.getByText("Đoạn chat")).toBeTruthy();
  });

  test("sends only into local demo state", () => {
    renderWithQueryClient(<ChatDemoPage />);

    const composer = screen.getByLabelText("Soạn tin nhắn");
    fireEvent.change(composer, { target: { value: "Tin nhắn demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn demo" }));
    expect(screen.getByText("Tin nhắn demo")).toBeTruthy();
    expect(composer).toHaveProperty("value", "");
  });

  test("groups consecutive inbound messages with one trailing avatar", () => {
    renderWithQueryClient(<ChatDemoPage />);

    expect(screen.getAllByLabelText("Ảnh đại diện Chị Mai Anh")).toHaveLength(1);
  });

  test("sends with Enter and keeps Shift Enter for a new line", () => {
    renderWithQueryClient(<ChatDemoPage />);

    const composer = screen.getByLabelText("Soạn tin nhắn");
    fireEvent.change(composer, { target: { value: "Gửi bằng Enter" } });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });
    expect(screen.getByText("Gửi bằng Enter")).toBeTruthy();
    expect(composer).toHaveProperty("value", "");

    fireEvent.change(composer, { target: { value: "Dòng thứ nhất" } });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter", shiftKey: true });
    expect(composer).toHaveProperty("value", "Dòng thứ nhất");
  });

  test("shows the selected parent contact hierarchy", () => {
    renderWithQueryClient(<ChatDemoPage />);

    expect(screen.getByText("Thông tin phụ huynh")).toBeTruthy();
    expect(screen.getByText("090 315 2684")).toBeTruthy();
    expect(screen.getByText("maianh.ph@gmail.com")).toBeTruthy();
    expect(screen.getByText("Học sinh đã đăng ký")).toBeTruthy();
  });

  test("keeps student details out of the conversation list", () => {
    renderWithQueryClient(<ChatDemoPage />);

    const list = within(screen.getByLabelText("Danh sách hội thoại"));
    expect(list.queryByText(/Nguyễn Gia Minh/)).toBeNull();
    expect(screen.getByPlaceholderText("Tìm phụ huynh")).toBeTruthy();
  });

  test("toggles a sample tag directly on the Composer", () => {
    renderWithQueryClient(<ChatDemoPage />);

    const composerTags = within(screen.getByLabelText("Tag mẫu trên Composer"));
    fireEvent.click(composerTags.getByRole("button", { name: "Gắn tag Đã mua" }));

    expect(composerTags.getByRole("button", { name: "Bỏ tag Đã mua" }).className).toContain("bg-[#16a34a]");
    expect(within(screen.getByLabelText("Tag của Chị Mai Anh")).getByText("Đã mua")).toBeTruthy();

    fireEvent.click(composerTags.getByRole("button", { name: "Bỏ tag Đã mua" }));
    expect(composerTags.getByRole("button", { name: "Gắn tag Đã mua" })).toBeTruthy();
  });

  test("creates a colored sample tag and makes it available on the Composer", () => {
    renderWithQueryClient(<ChatDemoPage />);

    const composerTags = within(screen.getByLabelText("Tag mẫu trên Composer"));
    fireEvent.click(composerTags.getByRole("button", { name: "Quản lý tag mẫu" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Chọn màu xanh lá" }));
    fireEvent.change(screen.getByLabelText("Tên tag"), { target: { value: "Học phí" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu tag" }));

    fireEvent.click(composerTags.getByRole("button", { name: "Gắn tag Học phí" }));
    expect(composerTags.getByRole("button", { name: "Bỏ tag Học phí" }).className).toContain("bg-[#16a34a]");
    expect(within(screen.getByLabelText("Tag của Chị Mai Anh")).getByText("Học phí")).toBeTruthy();
  });
});
