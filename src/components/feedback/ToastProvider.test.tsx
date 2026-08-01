// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { useToast } from "@/components/feedback/toastContext";

function ToastHarness() {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast({ title: "Đã lưu", tone: "success" })}>
      Hiện thông báo
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ToastProvider", () => {
  test("uses the Elinkgolf 3.2s lifecycle by default", () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastHarness /></ToastProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Hiện thông báo" }));
    const toast = screen.getByRole("status");
    expect(toast.className).toContain("toast-lifecycle");
    expect(toast.getAttribute("style")).toContain("3200ms");

    act(() => vi.advanceTimersByTime(3199));
    expect(screen.queryByRole("status")).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("keeps a manually dismissed toast mounted for its 250ms exit", () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastHarness /></ToastProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Hiện thông báo" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng thông báo" }));
    expect(screen.getByRole("status").className).toContain("toast-exit");

    act(() => vi.advanceTimersByTime(249));
    expect(screen.queryByRole("status")).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
