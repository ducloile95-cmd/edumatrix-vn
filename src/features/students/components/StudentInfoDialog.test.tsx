// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { StudentInfoDialog } from "@/features/students/components/StudentInfoDialog";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";
import type { StudentDoc } from "@/types/academic";

const serviceMocks = vi.hoisted(() => ({
  linkParentToStudent: vi.fn(),
  listClasses: vi.fn(),
  listCourses: vi.fn(),
  listUsersByIds: vi.fn(),
  listUsersByRole: vi.fn(),
  setStudentStatus: vi.fn(),
  syncStudentEnrollments: vi.fn(),
  updateParentProfile: vi.fn(),
  updateStudent: vi.fn(),
}));

vi.mock("@/services/firestore/classes", () => ({ listClasses: serviceMocks.listClasses }));
vi.mock("@/services/firestore/courses", () => ({ listCourses: serviceMocks.listCourses }));
vi.mock("@/services/firestore/enrollments", () => ({ syncStudentEnrollments: serviceMocks.syncStudentEnrollments }));
vi.mock("@/services/firestore/students", () => ({
  linkParentToStudent: serviceMocks.linkParentToStudent,
  setStudentStatus: serviceMocks.setStudentStatus,
  updateStudent: serviceMocks.updateStudent,
}));
vi.mock("@/services/firestore/users", () => ({
  listUsersByIds: serviceMocks.listUsersByIds,
  listUsersByRole: serviceMocks.listUsersByRole,
  updateParentProfile: serviceMocks.updateParentProfile,
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
  serviceMocks.syncStudentEnrollments.mockResolvedValue(undefined);
  serviceMocks.updateStudent.mockResolvedValue(undefined);
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
      expect(serviceMocks.syncStudentEnrollments).toHaveBeenCalledWith("student-1", ["class-1", "class-2"]);
    });
    expect(serviceMocks.updateStudent).toHaveBeenCalledWith("student-1", expect.objectContaining({
      nickname: "Bin",
    }));
  });

  test("keeps relationship rows read-only for a non-admin viewer", async () => {
    renderWithQueryClient(
      <StudentInfoDialog canManageLinks={false} open student={student} onClose={vi.fn()} />,
    );

    expect(await screen.findByText("Lớp Toán A1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Lớp học.*Chỉnh sửa/i })).toBeNull();
  });
});
