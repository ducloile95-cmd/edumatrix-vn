// @vitest-environment jsdom

import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ViewerAssignmentsPage from "@/features/assignments/pages/ViewerAssignmentsPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  listAccessibleClassesByIds: vi.fn(),
  getStudent: vi.fn(),
  listAssignmentsByClass: vi.fn(),
  listSubmissionsByStudents: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ userDoc: { studentIds: ["student-1"] } }),
}));

vi.mock("@/services/firestore/students", () => ({
  getStudent: serviceMocks.getStudent,
}));

vi.mock("@/services/firestore/classes", () => ({
  listAccessibleClassesByIds: serviceMocks.listAccessibleClassesByIds,
}));

vi.mock("@/services/firestore/assignments", () => ({
  listAssignmentsByClass: serviceMocks.listAssignmentsByClass,
  listSubmissionsByStudents: serviceMocks.listSubmissionsByStudents,
}));

function timestamp(date: Date) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  const later = new Date();
  later.setDate(later.getDate() + 30);

  serviceMocks.getStudent.mockResolvedValue({
    id: "student-1",
    currentClassIds: ["class-1"],
    fullName: "Nguyễn An",
    studentCode: "HS001",
  });
  serviceMocks.listAccessibleClassesByIds.mockResolvedValue([{
    id: "class-1",
    name: "Lớp Toán A1",
  }]);
  serviceMocks.listAssignmentsByClass.mockResolvedValue([
    {
      id: "assignment-graded",
      classId: "class-1",
      description: "Bài đã hoàn thành.",
      dueAt: timestamp(later),
      maxScore: 10,
      title: "Bài đã chấm",
    },
    {
      id: "assignment-todo",
      classId: "class-1",
      description: "Hoàn thành các câu từ 1 đến 5.",
      dueAt: timestamp(tomorrow),
      maxScore: 10,
      title: "Bài cần làm",
    },
  ]);
  serviceMocks.listSubmissionsByStudents.mockResolvedValue([
    {
      id: "submission-1",
      assignmentId: "assignment-graded",
      checkedBy: "teacher-1",
      score: 9,
      status: "graded",
      teacherComment: "Làm tốt.",
    },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ViewerAssignmentsPage mobile workflow", () => {
  test("prioritizes upcoming work and keeps mobile controls clear of bottom navigation", async () => {
    renderWithQueryClient(<ViewerAssignmentsPage />);

    await screen.findByRole("heading", { name: "Bài cần làm" });
    const cardHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(cardHeadings.map((heading) => heading.textContent)).toEqual([
      "Bài cần làm",
      "Bài đã chấm",
    ]);
    expect(screen.getByText("Sắp đến hạn")).toBeTruthy();

    const todoCard = cardHeadings[0].closest("article");
    const instructions = within(todoCard!).getByText("Xem hướng dẫn").closest("summary");
    expect(instructions?.className).toContain("min-h-touch");
    fireEvent.click(instructions!);
    expect((instructions?.parentElement as HTMLDetailsElement).open).toBe(true);

    const mobileTodoFilter = screen.getByRole("tab", { name: "Cần làm" });
    expect(mobileTodoFilter.className).toContain("text-xs");
    expect(mobileTodoFilter.parentElement?.className).toContain("bottom:calc(60px");
    fireEvent.click(mobileTodoFilter);

    expect(screen.queryByRole("heading", { name: "Bài đã chấm" })).toBeNull();
  });

  test("keeps the student portal available when no class is readable", async () => {
    serviceMocks.listAccessibleClassesByIds.mockResolvedValue([]);

    renderWithQueryClient(<ViewerAssignmentsPage />);

    expect(await screen.findByText("Chưa được phân lớp")).toBeTruthy();
    expect(screen.queryByText("Không thể tải danh sách bài tập")).toBeNull();
    expect(serviceMocks.listAssignmentsByClass).not.toHaveBeenCalled();
  });
});
