// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import FormPopupDemoPage from "@/features/demo/pages/FormPopupDemoPage";

describe("FormPopupDemoPage popup widths", () => {
  afterEach(cleanup);

  test("widens an unapproved form while preserving the approved lesson-plan workspace", () => {
    render(<FormPopupDemoPage />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo \/ sửa môn học/ }));

    const regularDialog = screen.getByRole("dialog");
    expect(regularDialog.className).toContain("lg:max-w-[1760px]");
    expect(within(regularDialog).getByText(/^Thông tin định danh môn học · 1\.760 px$/)).toBeTruthy();
    expect(regularDialog.querySelector("form > div > div")?.className).toContain("xl:flex-row");

    cleanup();
    render(<FormPopupDemoPage />);
    fireEvent.click(screen.getByRole("button", { name: /Thiết lập giáo án/ }));

    const approvedDialog = screen.getByRole("dialog");
    expect(approvedDialog).toHaveProperty("style.maxWidth", "1920px");
    expect(within(approvedDialog).getByText(/^Không gian soạn thảo toàn màn hình · 1\.920 × 980$/)).toBeTruthy();
  });

  test("keeps the class popup fullscreen while toggling smart scheduling and supports multi-select assignment", () => {
    render(<FormPopupDemoPage />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo \/ sửa lớp học/ }));

    const dialog = screen.getByRole("dialog");
    const smartSchedule = within(dialog).getByRole("checkbox", { name: "Đang bật" });
    expect(dialog).toHaveProperty("style.maxWidth", "1920px");
    expect(dialog).toHaveProperty("style.maxHeight", "980px");
    expect(smartSchedule).toHaveProperty("checked", true);
    expect(within(dialog).getByTestId("class-popup-layout").className).toContain("xl:overflow-hidden");

    fireEvent.click(smartSchedule);
    expect(dialog).toHaveProperty("style.maxWidth", "1920px");
    expect(dialog).toHaveProperty("style.maxHeight", "980px");

    fireEvent.click(within(dialog).getByRole("button", { name: "Chọn môn học *" }));
    fireEvent.click(within(dialog).getByRole("option", { name: /^IELTS$/ }));
    expect(within(dialog).getByRole("option", { name: /^IELTS$/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(within(dialog).getByRole("button", { name: "Giáo viên phụ trách" }));
    fireEvent.click(within(dialog).getByRole("option", { name: /Thầy Bình/ }));
    expect(within(dialog).getByRole("option", { name: /Thầy Bình/ }).getAttribute("aria-selected")).toBe("true");
  });
});
