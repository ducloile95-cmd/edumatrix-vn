// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { StudentForm } from "@/features/students/components/StudentForm";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const authState = vi.hoisted(() => ({ value: { firebaseUser: { uid: "admin-1" }, role: "admin" } }));
const serviceMocks = vi.hoisted(() => ({
  createStudentWithRelations: vi.fn(),
  listClasses: vi.fn(),
  updateStudent: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState.value }));
vi.mock("@/services/firestore/students", () => ({
  createStudentWithRelations: serviceMocks.createStudentWithRelations,
  updateStudent: serviceMocks.updateStudent,
}));
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

describe("StudentForm atomic creation", () => {
  beforeEach(() => {
    authState.value = { firebaseUser: { uid: "admin-1" }, role: "admin" };
    serviceMocks.listClasses.mockResolvedValue([{ id: "class-1", name: "Lớp A1", courseId: "course-1", status: "active" }]);
    serviceMocks.createStudentWithRelations.mockResolvedValue(undefined);
    serviceMocks.updateStudent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("submits student and all requested relations in one service call", async () => {
    const onDone = vi.fn();
    renderWithQueryClient(<StudentForm onDone={onDone} />);
    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Email liên kết/), { target: { value: "phuhuynh@example.com" } });
    fireEvent.change(screen.getByLabelText(/Lớp học/), { target: { value: "class-1" } });
    submit();

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(serviceMocks.createStudentWithRelations).toHaveBeenCalledWith(expect.objectContaining({
      classId: "class-1",
      parentEmail: "phuhuynh@example.com",
      studentCode: "HS001",
    }));
  });

  test("keeps form values and shows a specific relation error when transaction fails", async () => {
    serviceMocks.createStudentWithRelations.mockRejectedValue(new Error("PARENT_NOT_FOUND"));
    const onDone = vi.fn();
    renderWithQueryClient(<StudentForm onDone={onDone} />);
    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Email liên kết/), { target: { value: "missing@example.com" } });
    submit();

    await screen.findByText(/Không tìm thấy tài khoản phụ huynh/);
    expect(screen.getByLabelText<HTMLInputElement>(/Mã học sinh/).value).toBe("HS001");
    expect(onDone).not.toHaveBeenCalled();
  });

  test("does not submit twice while the transaction is pending", async () => {
    serviceMocks.createStudentWithRelations.mockImplementation(() => new Promise(() => undefined));
    renderWithQueryClient(<StudentForm />);
    await fillRequiredFields();
    submit();

    const pendingButton = await screen.findByRole<HTMLButtonElement>("button", { name: "Đang lưu..." });
    expect(pendingButton.disabled).toBe(true);
    fireEvent.click(pendingButton);
    expect(serviceMocks.createStudentWithRelations).toHaveBeenCalledTimes(1);
  });

  test("requires a teacher to select an active assigned class", async () => {
    authState.value = { firebaseUser: { uid: "teacher-1" }, role: "teacher" };
    renderWithQueryClient(<StudentForm />);
    await fillRequiredFields();
    submit();

    expect(await screen.findByText("Giáo viên phải chọn lớp mình phụ trách")).toBeTruthy();
    expect(serviceMocks.createStudentWithRelations).not.toHaveBeenCalled();
  });
});
