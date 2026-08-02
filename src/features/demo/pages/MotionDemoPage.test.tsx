// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import MotionDemoPage from "@/features/demo/pages/MotionDemoPage";

afterEach(cleanup);

describe("MotionDemoPage", () => {
  test("replays the current scene and exposes explicit motion modes", () => {
    const { container } = render(<ToastProvider><MotionDemoPage /></ToastProvider>);
    const firstHero = container.querySelector(".motion-demo-hero-copy");

    fireEvent.click(screen.getByRole("button", { name: "Replay cảnh" }));
    expect(container.querySelector(".motion-demo-hero-copy")).not.toBe(firstHero);

    fireEvent.click(screen.getByRole("button", { name: /Reduced/ }));
    expect(document.documentElement.dataset.demoMotion).toBe("reduced");
    expect(screen.getByRole("button", { name: /Reduced/ }).getAttribute("aria-pressed")).toBe("true");
  });

  test("starts and stops the guided auto tour", () => {
    render(<ToastProvider><MotionDemoPage /></ToastProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Chạy Auto Tour" }));
    expect(screen.getByRole("button", { name: "Dừng Auto Tour" })).not.toBeNull();
    expect(document.querySelector(".motion-demo-tour-progress")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Dừng Auto Tour" }));
    expect(screen.getByRole("button", { name: "Chạy Auto Tour" })).not.toBeNull();
  });

  test("demonstrates tabs, modal and system feedback states", () => {
    render(<ToastProvider><MotionDemoPage /></ToastProvider>);

    fireEvent.click(screen.getByRole("tab", { name: /Tương tác/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mở popup" }));
    expect(screen.getByRole("dialog", { name: "Tạo thông báo lớp học" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    fireEvent.click(screen.getByRole("tab", { name: /Phản hồi hệ thống/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lỗi" }));
    expect(screen.getByText(/Kết nối bị gián đoạn/)).not.toBeNull();
  });
});
