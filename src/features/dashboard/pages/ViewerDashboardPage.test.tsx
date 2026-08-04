// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ViewerDashboardPage from "@/features/dashboard/pages/ViewerDashboardPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  buildViewerDashboard: vi.fn(),
  getAcademicSettings: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    firebaseUser: { uid: "viewer-1" },
    userDoc: { studentIds: ["student-1", "student-2"] },
  }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/services/firestore/viewerDashboard", () => ({
  buildViewerDashboard: serviceMocks.buildViewerDashboard,
}));

vi.mock("@/services/firestore/settings", () => ({
  getAcademicSettings: serviceMocks.getAcademicSettings,
}));

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PolarAngleAxis: () => null,
  RadialBar: () => null,
  RadialBarChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

function timestamp(value: string) {
  const date = new Date(value);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  const createdAt = timestamp("2026-06-01T08:00:00+07:00");
  const dueAt = timestamp("2026-08-05T23:59:00+07:00");

  serviceMocks.getAcademicSettings.mockResolvedValue({});
  serviceMocks.buildViewerDashboard.mockResolvedValue({
    announcements: [],
    assignments: [],
    attendance: [],
    attendanceHistory: [],
    classes: [
      { id: "class-1", courseId: "course-1", name: "Lớp Toán A1" },
      { id: "class-2", courseId: "course-2", name: "Lớp Văn B1" },
    ],
    courses: [
      { id: "course-1", name: "Toán nền tảng" },
      { id: "course-2", name: "Ngữ văn" },
    ],
    latestScores: [],
    lessonPlans: [],
    nextSessions: [],
    pendingAssignments: [],
    scores: [],
    studentIds: ["student-1", "student-2"],
    students: [
      {
        id: "student-1",
        createdAt,
        currentClassIds: ["class-1"],
        fullName: "Nguyễn An",
        nickname: "Bin",
        studentCode: "HS001",
      },
      {
        id: "student-2",
        createdAt,
        currentClassIds: ["class-2"],
        fullName: "Trần Bảo",
        studentCode: "HS002",
      },
    ],
    submissions: [],
    unpaidInvoices: [
      {
        id: "invoice-1",
        amount: 1_200_000,
        dueAt,
        status: "unpaid",
        studentId: "student-1",
        title: "Học phí Toán tháng 8",
      },
      {
        id: "invoice-2",
        amount: 900_000,
        dueAt,
        status: "overdue",
        studentId: "student-2",
        title: "Học phí Văn tháng 8",
      },
    ],
    updatedAt: null,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ViewerDashboardPage content priorities", () => {
  test("puts learning information before actionable items and keeps the selected student", async () => {
    renderWithQueryClient(
      <MemoryRouter>
        <ViewerDashboardPage />
      </MemoryRouter>,
    );

    const prioritySection = await screen.findByRole("region", { name: "Việc cần quan tâm" });
    const profileSection = screen.getByRole("region", { name: "Hồ sơ học tập" });
    const learningSection = screen.getByRole("region", { name: "Tổng quan học tập" });
    expect(profileSection.className).toContain("order-1");
    expect(learningSection.className).toContain("order-2");
    expect(prioritySection.className).toContain("order-3");
    expect(within(prioritySection).getByText("Học phí Toán tháng 8")).toBeTruthy();

    const studentSelect = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "Đang xem thông tin của",
    });
    expect(studentSelect.parentElement?.className).toContain("min-h-touch");
    fireEvent.change(studentSelect, { target: { value: "student-2" } });

    expect(await screen.findByRole("heading", { name: "Trần Bảo" })).toBeTruthy();
    expect(within(prioritySection).getByText("Học phí Văn tháng 8")).toBeTruthy();
    expect(window.localStorage.getItem("edumatrix.viewer.selectedStudentId")).toBe("student-2");
  });
});
