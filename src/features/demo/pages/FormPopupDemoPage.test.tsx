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

  test("keeps the class popup fullscreen with smart scheduling always visible and supports multi-select assignment", () => {
    render(<FormPopupDemoPage />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo \/ sửa lớp học/ }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveProperty("style.maxWidth", "1920px");
    expect(dialog).toHaveProperty("style.maxHeight", "980px");
    expect(within(dialog).queryByRole("checkbox", { name: "Đang bật" })).toBeNull();
    expect(within(dialog).getByText("Mặc định bật")).toBeTruthy();
    expect(within(dialog).getByTestId("class-popup-layout").className).toContain("xl:overflow-hidden");

    fireEvent.click(within(dialog).getByRole("button", { name: "Môn học *" }));
    fireEvent.click(within(dialog).getByRole("option", { name: /^IELTS$/ }));
    expect(within(dialog).getByRole("option", { name: /^IELTS$/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(within(dialog).getByRole("button", { name: "Giáo viên phụ trách" }));
    fireEvent.click(within(dialog).getByRole("option", { name: /Thầy Bình/ }));
    expect(within(dialog).getByRole("option", { name: /Thầy Bình/ }).getAttribute("aria-selected")).toBe("true");
  });

  test("previews three popup patterns without changing field order or submit behavior", () => {
    render(<FormPopupDemoPage />);

    expect(screen.getAllByText(/Tập trung|Cân bằng|Workspace ngang/).length).toBeGreaterThanOrEqual(3);
    fireEvent.click(screen.getByRole("button", { name: /Tập trung/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tạo \/ sửa môn học/ }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("lg:max-w-[1080px]");
    expect(within(dialog).getByTestId("popup-form-layout").getAttribute("data-pattern")).toBe("focus");
    expect(within(dialog).getByLabelText(/Tên môn học/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/Mã môn học/)).toBeTruthy();
  });

  test("keeps the student detail fields aligned with student creation and edits linked records from each row", () => {
    render(<FormPopupDemoPage />);
    fireEvent.click(screen.getByRole("button", { name: /Hồ sơ học sinh chi tiết/ }));

    const dialog = screen.getByRole("dialog");
    [
      "Mã học sinh",
      "Tên học sinh",
      "Biệt danh / tên gọi khác",
      "Ngày sinh",
      "Ghi chú giáo viên/Admin",
      "Tên phụ huynh",
      "Số điện thoại",
      "Email liên kết",
      "Link Facebook liên kết",
      "Địa chỉ",
    ].forEach((label) => expect(within(dialog).getByLabelText(label)).toBeTruthy());

    fireEvent.click(within(dialog).getByRole("button", { name: /Lớp học.*Chỉnh sửa/ }));
    const classList = within(dialog).getByRole("listbox", { name: "Danh sách Lớp học" });
    fireEvent.click(within(classList).getByRole("option", { name: /IELTS Foundation A2/ }));
    expect(within(classList).getByRole("option", { name: /IELTS Foundation A2/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(within(dialog).getByRole("button", { name: /Khóa học.*Chỉnh sửa/ }));
    expect(within(dialog).getByRole("listbox", { name: "Danh sách Khóa học" })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: /Giáo viên phụ trách.*Chỉnh sửa/ }));
    expect(within(dialog).getByRole("listbox", { name: "Danh sách Giáo viên phụ trách" })).toBeTruthy();
  });

  test("previews class billing by selecting a class and multiple students", () => {
    render(<FormPopupDemoPage />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo hóa đơn/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Chọn lớp lập học phí" })).toBeTruthy();
    expect(within(dialog).getByText("Chưa chọn lớp học")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Chọn lớp IELTS Foundation A1" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Nguyễn Minh Anh/ }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Trần Gia Hân/ }));

    expect(within(dialog).getByText(/2 học sinh đã chọn/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Tạo 2 hóa đơn" })).toBeTruthy();
  });

  test("integrates flat-fee module billing into the create invoice dialog", () => {
    render(<FormPopupDemoPage />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo hóa đơn/ }));

    const dialog = screen.getByRole("dialog", { name: "Tạo hóa đơn" });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Hóa đơn học phần" }));

    expect(within(dialog).getByRole("heading", { name: "Chọn học phần" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Chọn học phần IELTS Writing Foundation" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Chọn tất cả (3)" }));

    expect(within(dialog).queryByRole("spinbutton", { name: /Số buổi/ })).toBeNull();
    expect(within(dialog).getByLabelText(/Mức thu học phần/)).toHaveProperty("value", "2.400.000 đ");
    expect(within(dialog).getByRole("button", { name: "Tạo 3 hóa đơn" })).toBeTruthy();
  });
});
