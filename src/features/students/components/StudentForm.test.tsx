// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { StudentForm } from "@/features/students/components/StudentForm";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const authState = vi.hoisted(() => ({ value: { firebaseUser: { uid: "admin-1" }, role: "admin" } }));

const serviceMocks = vi.hoisted(() => ({
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  linkParentToStudent: vi.fn(),
  enrollStudent: vi.fn(),
  listClasses: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState.value }));

vi.mock("@/services/firestore/students", () => ({
  createStudent: serviceMocks.createStudent,
  updateStudent: serviceMocks.updateStudent,
  linkParentToStudent: serviceMocks.linkParentToStudent,
}));

vi.mock("@/services/firestore/enrollments", () => ({ enrollStudent: serviceMocks.enrollStudent }));
vi.mock("@/services/firestore/classes", () => ({ listClasses: serviceMocks.listClasses }));

async function fillRequiredFields() {
  await screen.findByRole("option", { name: "Lớp A1 - class-1" });
  fireEvent.change(screen.getByLabelText(/Mã học sinh/), { target: { value: "HS001" } });
  fireEvent.change(screen.getByLabelText(/Tên học sinh/), { target: { value: "Nguyễn Minh Anh" } });
  fireEvent.change(screen.getByLabelText(/Ngày sinh/), { target: { value: "2015-04-02" } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Thêm học sinh" }));
}

describe("StudentForm partial-write handling", () => {
  beforeEach(() => {
    serviceMocks.listClasses.mockResolvedValue([{ id: "class-1", name: "Lớp A1", courseId: "course-1" }]);
    serviceMocks.createStudent.mockResolvedValue(undefined);
    serviceMocks.updateStudent.mockResolvedValue(undefined);
    serviceMocks.linkParentToStudent.mockResolvedValue({ linked: true });
    serviceMocks.enrollStudent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("closes the form and reports nothing when every step succeeds", async () => {
    const onDone = vi.fn();
    renderWithQueryClient(<StudentForm onDone={onDone} />);
    await fillRequiredFields();
    submit();

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/chưa hoàn tất/)).toBeNull();
  });

  test("keeps the student and warns instead of throwing when parent link and enrollment both fail", async () => {
    serviceMocks.linkParentToStudent.mockRejectedValue(new Error("permission-denied"));
    serviceMocks.enrollStudent.mockRejectedValue(new Error("permission-denied"));
    const onDone = vi.fn();
    renderWithQueryClient(<StudentForm onDone={onDone} />);
    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Email liên kết/), { target: { value: "phuhuynh@example.com" } });
    fireEvent.change(screen.getByLabelText(/Lớp học/), { target: { value: "class-1" } });
    submit();

    // (c) ca hai canh bao deu hien, khong phai chi canh bao phu huynh.
    await screen.findByText(/Chưa liên kết phụ huynh do lỗi ghi dữ liệu/);
    await screen.findByText(/Chưa ghi danh do lỗi ghi dữ liệu/);

    // (a) mutation van thanh cong: hoc sinh da duoc tao, khong co loi do.
    expect(serviceMocks.createStudent).toHaveBeenCalledTimes(1);
    expect(serviceMocks.enrollStudent).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Không thể lưu học sinh/)).toBeNull();
    expect(screen.getByText(/Hồ sơ đã được lưu an toàn/)).toBeTruthy();
    expect(screen.getByText(/Vào Lớp học, mở lớp đã chọn và ghi danh học sinh/)).toBeTruthy();

    // Form giu nguyen de Admin doc canh bao, khong dong ngay.
    expect(onDone).not.toHaveBeenCalled();
  });

  test("blocks a second submit so the retry cannot hit student_code_exists", async () => {
    serviceMocks.linkParentToStudent.mockResolvedValue({ linked: false, reason: "not_viewer" });
    renderWithQueryClient(<StudentForm />);
    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Email liên kết/), { target: { value: "phuhuynh@example.com" } });
    submit();

    // Du an khong cai @testing-library/jest-dom nen kiem tra thuoc tinh DOM truc tiep.
    const resubmit = await screen.findByRole<HTMLButtonElement>("button", { name: "Đã tạo học sinh" });
    expect(resubmit.disabled).toBe(true);
    fireEvent.click(resubmit);

    // (b) khong co lan goi createStudent thu hai.
    await waitFor(() => expect(serviceMocks.createStudent).toHaveBeenCalledTimes(1));
  });
});
