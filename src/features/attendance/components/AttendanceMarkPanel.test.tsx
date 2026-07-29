// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AttendanceMarkPanel } from "@/features/attendance/components/AttendanceMarkPanel";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  getClass: vi.fn(),
  listAttendanceBySession: vi.fn(),
  listAttendanceByStudents: vi.fn(),
  listCourses: vi.fn(),
  listSessions: vi.fn(),
  listSessionsByClass: vi.fn(),
  listStudents: vi.fn(),
  saveAttendance: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ firebaseUser: { uid: "teacher-1" } }),
}));

vi.mock("@/services/firestore/classes", () => ({
  getClass: serviceMocks.getClass,
}));

vi.mock("@/services/firestore/courses", () => ({
  listCourses: serviceMocks.listCourses,
}));

vi.mock("@/services/firestore/students", () => ({
  listStudents: serviceMocks.listStudents,
}));

vi.mock("@/services/firestore/sessions", () => ({
  listSessions: serviceMocks.listSessions,
  listSessionsByClass: serviceMocks.listSessionsByClass,
}));

vi.mock("@/services/firestore/attendance", () => ({
  listAttendanceBySession: serviceMocks.listAttendanceBySession,
  listAttendanceByStudents: serviceMocks.listAttendanceByStudents,
  saveAttendance: serviceMocks.saveAttendance,
}));

function timestamp(value: string) {
  const date = new Date(value);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

beforeEach(() => {
  const startAt = timestamp("2026-07-29T08:00:00+07:00");
  const endAt = timestamp("2026-07-29T09:30:00+07:00");

  serviceMocks.listSessions.mockResolvedValue([
    {
      id: "session-1",
      classId: "class-1",
      title: "Toán A",
      startAt,
      endAt,
      location: "Phòng 201",
      status: "scheduled",
    },
  ]);
  serviceMocks.getClass.mockResolvedValue({
    id: "class-1",
    name: "Toán A",
    courseId: "course-1",
    studentIds: ["student-1"],
    location: "Phòng 201",
  });
  serviceMocks.listCourses.mockResolvedValue([
    {
      id: "course-1",
      name: "Toán nền tảng",
      totalSessions: 24,
      startDate: timestamp("2026-06-01T00:00:00+07:00"),
      endDate: timestamp("2026-12-01T00:00:00+07:00"),
    },
  ]);
  serviceMocks.listStudents.mockResolvedValue([
    {
      id: "student-1",
      fullName: "Nguyễn An",
      studentCode: "HS001",
      dateOfBirth: "2014-05-12",
      status: "active",
    },
  ]);
  serviceMocks.listAttendanceBySession.mockResolvedValue([]);
  serviceMocks.listAttendanceByStudents.mockResolvedValue([]);
  serviceMocks.listSessionsByClass.mockResolvedValue([]);
  serviceMocks.saveAttendance.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AttendanceMarkPanel mobile workflow", () => {
  test("changes a status, saves it, and clears stale success feedback after another edit", async () => {
    renderWithQueryClient(<AttendanceMarkPanel presetSessionId="session-1" />);

    const lateButton = await screen.findByRole("button", { name: "Đi muộn: Nguyễn An" });
    expect(lateButton.className).toContain("min-h-touch");
    fireEvent.click(lateButton);
    expect(lateButton.getAttribute("aria-pressed")).toBe("true");

    const saveButton = screen.getByRole("button", { name: "Lưu điểm danh (1)" });
    expect(saveButton.className).toContain("w-full");
    expect(saveButton.parentElement?.className).toContain("fixed");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(serviceMocks.saveAttendance).toHaveBeenCalledWith(
        "session-1",
        "class-1",
        [{ studentId: "student-1", status: "late", note: "" }],
        "teacher-1",
      );
    });
    await screen.findByRole("status");

    fireEvent.change(screen.getByLabelText("Ghi chú"), {
      target: { value: "Đến trễ 10 phút" },
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
