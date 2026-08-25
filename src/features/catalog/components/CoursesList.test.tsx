// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CoursesList } from "@/features/catalog/components/CoursesList";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  deleteCourse: vi.fn(),
  listCourses: vi.fn(),
  listSubjects: vi.fn(),
  setCourseStatus: vi.fn(),
  inspectDeletionDependencies: vi.fn(),
}));

vi.mock("@/services/firestore/courses", () => ({
  deleteCourse: serviceMocks.deleteCourse,
  listCourses: serviceMocks.listCourses,
  setCourseStatus: serviceMocks.setCourseStatus,
}));
vi.mock("@/services/firestore/subjects", () => ({ listSubjects: serviceMocks.listSubjects }));
vi.mock("@/services/firestore/deletionDependencies", () => ({ inspectDeletionDependencies: serviceMocks.inspectDeletionDependencies }));

describe("CoursesList hard delete", () => {
  beforeEach(() => {
    const date = { toDate: () => new Date("2026-08-01T00:00:00Z") };
    serviceMocks.listCourses.mockResolvedValue([{
      id: "course-1", name: "Khóa luyện chữ", subjectIds: ["MATH"], teacherIds: ["teacher-1"],
      pricePerSession: 100_000, tuitionFee: 2_000_000, totalSessions: 20,
      startDate: date, endDate: date, status: "active",
    }]);
    serviceMocks.listSubjects.mockResolvedValue([{ id: "MATH", name: "Toán", code: "MATH", status: "active" }]);
    serviceMocks.deleteCourse.mockResolvedValue(undefined);
    serviceMocks.inspectDeletionDependencies.mockResolvedValue({ allowed: true, total: 0, blockers: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("confirms and deletes the selected course permanently", async () => {
    renderWithQueryClient(
      <CoursesList onAdd={vi.fn()} onEdit={vi.fn()} subjectFilter={null} onClearSubjectFilter={vi.fn()} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Xóa vĩnh viễn khóa học Khóa luyện chữ" }));
    const confirmDelete = screen.getByRole("button", { name: "Xóa vĩnh viễn" });
    await waitFor(() => expect((confirmDelete as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirmDelete);

    await waitFor(() => expect(serviceMocks.deleteCourse).toHaveBeenCalledWith("course-1", expect.anything()));
  });

  test("shows dependency counts and keeps hard delete disabled", async () => {
    serviceMocks.inspectDeletionDependencies.mockResolvedValue({
      allowed: false,
      total: 3,
      blockers: [{ key: "classes", label: "Lớp học", count: 3 }],
    });
    renderWithQueryClient(
      <CoursesList onAdd={vi.fn()} onEdit={vi.fn()} subjectFilter={null} onClearSubjectFilter={vi.fn()} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Xóa vĩnh viễn khóa học Khóa luyện chữ" }));
    expect(await screen.findByText("Lớp học: 3")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Xóa vĩnh viễn" }) as HTMLButtonElement).disabled).toBe(true);
    expect(serviceMocks.deleteCourse).not.toHaveBeenCalled();
  });

  test("gives Teacher delete-only actions without Admin catalog controls", async () => {
    renderWithQueryClient(
      <CoursesList canManage={false} canDelete onAdd={vi.fn()} onEdit={vi.fn()} subjectFilter={null} onClearSubjectFilter={vi.fn()} />,
    );

    expect(await screen.findByRole("button", { name: "Xóa vĩnh viễn khóa học Khóa luyện chữ" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thêm khóa học" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sửa" })).toBeNull();
    expect(screen.queryByLabelText("Đổi trạng thái Khóa luyện chữ")).toBeNull();
  });
});
