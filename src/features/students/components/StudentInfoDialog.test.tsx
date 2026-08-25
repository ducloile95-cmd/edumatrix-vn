// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { StudentInfoDialog } from "@/features/students/components/StudentInfoDialog";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";
import type { StudentDoc } from "@/types/academic";

const serviceMocks = vi.hoisted(() => ({
  deleteStudent: vi.fn(),
  linkParentToStudent: vi.fn(),
  listClasses: vi.fn(),
  listCourses: vi.fn(),
  listUsersByIds: vi.fn(),
  listUsersByRole: vi.fn(),
  setStudentStatus: vi.fn(),
  inspectDeletionDependencies: vi.fn(),
  updateStudentWithRelations: vi.fn(),
}));

vi.mock("@/services/firestore/classes", () => ({ listClasses: serviceMocks.listClasses }));
vi.mock("@/services/firestore/courses", () => ({ listCourses: serviceMocks.listCourses }));
vi.mock("@/services/firestore/students", () => ({
  deleteStudent: serviceMocks.deleteStudent,
  setStudentStatus: serviceMocks.setStudentStatus,
  updateStudentWithRelations: serviceMocks.updateStudentWithRelations,
}));
vi.mock("@/services/firestore/users", () => ({
  listUsersByIds: serviceMocks.listUsersByIds,
  listUsersByRole: serviceMocks.listUsersByRole,
}));
vi.mock("@/services/firestore/deletionDependencies", () => ({
  inspectDeletionDependencies: serviceMocks.inspectDeletionDependencies,
}));

const timestamp = { toDate: () => new Date("2026-08-01T08:00:00+07:00") } as StudentDoc["createdAt"];
const student = {
  id: "student-1",
  createdAt: timestamp,
  currentClassIds: ["class-1"],
  dateOfBirth: "2014-05-12",
  fullName: "Nguyễn Minh An",
  nickname: "Bin",
  parentUids: [],
  staffNote: "Học tốt",
  status: "active" as const,
  studentCode: "HS001",
  teacherIds: ["teacher-1"],
  updatedAt: timestamp,
};

beforeEach(() => {
  vi.clearAllMocks();
  serviceMocks.listClasses.mockResolvedValue([
    { id: "class-1", courseId: "course-1", name: "Lớp Toán A1", teacherIds: ["teacher-1"] },
    { id: "class-2", courseId: "course-2", name: "Lớp Văn B1", teacherIds: ["teacher-2"] },
  ]);
  serviceMocks.listCourses.mockResolvedValue([
    { id: "course-1", name: "Toán nền tảng" },
    { id: "course-2", name: "Văn nền tảng" },
  ]);
  serviceMocks.listUsersByIds.mockResolvedValue([]);
  serviceMocks.listUsersByRole.mockResolvedValue([
    { uid: "teacher-1", displayName: "Cô An" },
    { uid: "teacher-2", displayName: "Thầy Bình" },
  ]);
  serviceMocks.inspectDeletionDependencies.mockResolvedValue({ allowed: true, total: 0, blockers: [] });
  serviceMocks.deleteStudent.mockResolvedValue(undefined);
  serviceMocks.updateStudentWithRelations.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("StudentInfoDialog", () => {
  test("uses a three-column desktop layout and saves class relationships", async () => {
    renderWithQueryClient(
      <StudentInfoDialog canManageLinks open student={student} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("student-info-layout").className).toContain("xl:grid-cols-3");
    expect((screen.getByLabelText("Biệt danh / tên gọi khác") as HTMLInputElement).value).toBe("Bin");

    const relationButton = await screen.findByRole("button", { name: /Lớp học.*Chỉnh sửa/i });
    fireEvent.click(relationButton);
    fireEvent.click(await screen.findByRole("option", { name: "Lớp Văn B1" }));
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật" }));

    await waitFor(() => {
      expect(serviceMocks.updateStudentWithRelations).toHaveBeenCalledWith("student-1", expect.objectContaining({
        actorUid: "unknown",
        classIds: ["class-1", "class-2"],
      }));
    });
    expect(serviceMocks.updateStudentWithRelations).toHaveBeenCalledWith("student-1", expect.objectContaining({
      nickname: "Bin",
    }));
  });

  test("does not sync enrollments when only student information changes", async () => {
    renderWithQueryClient(
      <StudentInfoDialog canManageLinks open student={student} onClose={vi.fn()} />,
    );

    const fullNameInput = screen.getByDisplayValue(student.fullName) as HTMLInputElement;
    fireEvent.change(fullNameInput, { target: { value: "Updated Student" } });
    fireEvent.submit(fullNameInput.form!);

    await waitFor(() => {
      expect(serviceMocks.updateStudentWithRelations).toHaveBeenCalledWith("student-1", expect.objectContaining({
        fullName: "Updated Student",
      }));
    });
    expect(serviceMocks.updateStudentWithRelations).toHaveBeenCalledTimes(1);
  });

  test("adds a class from another course without removing current classes", async () => {
    renderWithQueryClient(
      <StudentInfoDialog canManageLinks open student={student} onClose={vi.fn()} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Khóa học.*Chỉnh sửa/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Lớp Văn B1" }));
    const fullNameInput = screen.getByDisplayValue(student.fullName) as HTMLInputElement;
    fireEvent.submit(fullNameInput.form!);

    await waitFor(() => {
      expect(serviceMocks.updateStudentWithRelations).toHaveBeenCalledWith("student-1", expect.objectContaining({
        classIds: ["class-1", "class-2"],
      }));
    });
  });

  test("keeps relationship rows read-only for a non-admin viewer", async () => {
    renderWithQueryClient(
      <StudentInfoDialog canManageLinks={false} open student={student} onClose={vi.fn()} />,
    );

    expect(await screen.findByText("Lớp Toán A1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Lớp học.*Chỉnh sửa/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xóa học sinh" })).toBeNull();
  });

  test("lets Teacher hard-delete while relationship editing stays read-only", async () => {
    renderWithQueryClient(
      <StudentInfoDialog canManageLinks={false} canDelete open student={student} onClose={vi.fn()} />,
    );

    expect(await screen.findByRole("button", { name: "Xóa học sinh" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Lớp học.*Chỉnh sửa/i })).toBeNull();
  });

  test("requires the student code before hard deletion", async () => {
    const onClose = vi.fn();
    renderWithQueryClient(
      <StudentInfoDialog canManageLinks open student={student} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xóa học sinh" }));
    const confirmButton = screen.getByRole("button", { name: "Xóa vĩnh viễn" });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Nhập HS001 để xác nhận/i), { target: { value: "HS001" } });
    await waitFor(() => expect((confirmButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirmButton);

    await waitFor(() => expect(serviceMocks.deleteStudent).toHaveBeenCalledWith("student-1"));
    expect(onClose).toHaveBeenCalled();
  });
});
