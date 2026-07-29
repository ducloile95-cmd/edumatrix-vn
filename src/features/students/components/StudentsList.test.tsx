// @vitest-environment jsdom

import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { StudentsList } from "@/features/students/components/StudentsList";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  listAttendanceByStudents: vi.fn(),
  listClasses: vi.fn(),
  listCourses: vi.fn(),
  listStudentSummariesByIds: vi.fn(),
  listStudents: vi.fn(),
  listSubmissionsByStudents: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ role: "admin" }),
}));

vi.mock("@/services/firestore/assignments", () => ({
  listSubmissionsByStudents: serviceMocks.listSubmissionsByStudents,
}));

vi.mock("@/services/firestore/attendance", () => ({
  listAttendanceByStudents: serviceMocks.listAttendanceByStudents,
}));

vi.mock("@/services/firestore/classes", () => ({
  listClasses: serviceMocks.listClasses,
}));

vi.mock("@/services/firestore/courses", () => ({
  listCourses: serviceMocks.listCourses,
}));

vi.mock("@/services/firestore/scores", () => ({
  listStudentSummariesByIds: serviceMocks.listStudentSummariesByIds,
}));

vi.mock("@/services/firestore/students", () => ({
  listStudents: serviceMocks.listStudents,
}));

vi.mock("@/features/students/components/StudentInfoDialog", () => ({
  StudentInfoDialog: ({
    open,
    student,
  }: {
    open: boolean;
    student: { fullName: string } | null;
  }) => open && (
    <div aria-label={`Chi tiết ${student?.fullName ?? ""}`} role="dialog">
      {student?.fullName}
    </div>
  ),
}));

function timestamp(value: string) {
  const date = new Date(value);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

beforeEach(() => {
  const createdAt = timestamp("2026-06-01T08:00:00+07:00");
  const updatedAt = timestamp("2026-07-29T08:00:00+07:00");

  serviceMocks.listStudents.mockResolvedValue([
    {
      id: "student-1",
      createdAt,
      currentClassIds: ["class-1"],
      dateOfBirth: "2014-05-12",
      fullName: "Nguyễn An",
      nickname: "Bin",
      parentUids: [],
      status: "active",
      studentCode: "HS001",
      teacherIds: ["teacher-1"],
      updatedAt,
    },
  ]);
  serviceMocks.listClasses.mockResolvedValue([
    {
      id: "class-1",
      courseId: "course-1",
      name: "Lớp Toán A1",
    },
  ]);
  serviceMocks.listCourses.mockResolvedValue([
    {
      id: "course-1",
      name: "Toán nền tảng",
      totalSessions: 24,
    },
  ]);
  serviceMocks.listAttendanceByStudents.mockResolvedValue([]);
  serviceMocks.listSubmissionsByStudents.mockResolvedValue([]);
  serviceMocks.listStudentSummariesByIds.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StudentsList responsive views", () => {
  test("renders a touch-friendly mobile card while retaining the desktop table", async () => {
    renderWithQueryClient(<StudentsList />);

    const mobileList = await screen.findByRole("list", {
      name: "Danh sách học sinh trên di động",
    });
    expect(mobileList.className).toContain("md:hidden");
    expect(within(mobileList).getByText("Nguyễn An (Bin)")).toBeTruthy();
    expect(within(mobileList).getByText("Lớp Toán A1")).toBeTruthy();

    const desktopTable = screen.getByRole("region", {
      name: "Bảng học sinh trên máy tính",
    });
    expect(desktopTable.className).toContain("hidden");
    expect(desktopTable.className).toContain("md:block");

    const statusFilter = screen.getByRole("button", { name: "Đang học" });
    expect(statusFilter.className).toContain("min-h-touch");

    const detailsButton = within(mobileList).getByRole("button", {
      name: "Xem thông tin Nguyễn An (Bin)",
    });
    expect(detailsButton.className).toContain("min-h-touch");
    expect(detailsButton.className).toContain("w-full");
    fireEvent.click(detailsButton);

    expect(await screen.findByRole("dialog", { name: "Chi tiết Nguyễn An" })).toBeTruthy();
  });
});
