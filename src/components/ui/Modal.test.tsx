// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Mở hộp thoại</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo học sinh"
        description="Nhập thông tin cơ bản."
      >
        <label htmlFor="student-name">Tên học sinh</label>
        <input id="student-name" />
        <button type="button">Lưu</button>
      </Modal>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Modal", () => {
  test("keeps dialog semantics and mobile bottom-sheet layout", () => {
    render(
      <Modal open onClose={() => undefined} title="Chi tiết">
        Nội dung
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Chi tiết" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.className).toContain("rounded-t-modal");
    expect(dialog.className).toContain("sm:rounded-modal");
    expect(dialog.className).toContain("lg:max-w-[1080px]");
    expect(dialog.parentElement?.className).toContain("items-end");
  });

  test("uses the 1920 by 980 workspace only on desktop for the 2xl size", () => {
    render(
      <Modal open onClose={() => undefined} title="Thiết lập giáo án" size="2xl">
        Nội dung giáo án
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Thiết lập giáo án" });
    expect(dialog.className).toContain("max-w-[1920px]");
    expect(dialog.className).toContain("lg:max-h-[980px]");
    expect(dialog.className).toContain("lg:h-dvh");
    expect(dialog.parentElement?.className).toContain("lg:p-0");
    expect(dialog.style.width).toBe("100vw");
    expect(dialog.style.maxWidth).toBe("1920px");
    expect(dialog.style.maxHeight).toBe("980px");
  });

  test("reserves the mobile bottom safe area for custom body layouts", () => {
    render(
      <Modal open onClose={() => undefined} title="Custom layout" bodyClassName="flex overflow-hidden p-0">
        Nội dung
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Custom layout" });
    expect(dialog.className).toContain("pb-[env(safe-area-inset-bottom)]");
  });

  test("closes with Escape and returns focus to the trigger", async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "Mở hộp thoại" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Tạo học sinh" });
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(trigger).toBe(document.activeElement);
    });
  });

  test("traps keyboard focus inside the dialog", async () => {
    render(<ModalHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Mở hộp thoại" }));

    const closeButton = screen.getByRole("button", { name: "Đóng hộp thoại" });
    const saveButton = screen.getByRole("button", { name: "Lưu" });
    await waitFor(() => {
      expect(closeButton).toBe(document.activeElement);
    });

    saveButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toBe(document.activeElement);

    closeButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(saveButton).toBe(document.activeElement);
  });

  test("keeps the dialog mounted for the 200ms exit animation", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <Modal open onClose={() => undefined} title="Chi tiết">
        Nội dung
      </Modal>,
    );

    rerender(
      <Modal open={false} onClose={() => undefined} title="Chi tiết">
        Nội dung
      </Modal>,
    );
    expect(screen.queryByRole("dialog", { name: "Chi tiết" })).not.toBeNull();

    act(() => vi.advanceTimersByTime(199));
    expect(screen.queryByRole("dialog", { name: "Chi tiết" })).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("dialog", { name: "Chi tiết" })).toBeNull();
  });
});
