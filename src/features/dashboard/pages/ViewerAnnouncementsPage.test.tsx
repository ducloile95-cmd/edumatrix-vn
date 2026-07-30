// @vitest-environment jsdom

import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ViewerAnnouncementsPage from "@/features/dashboard/pages/ViewerAnnouncementsPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  getStudent: vi.fn(),
  listAnnouncementsByStudent: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ userDoc: { studentIds: ["student-1", "student-2"] } }),
}));

vi.mock("@/services/firestore/students", () => ({
  getStudent: serviceMocks.getStudent,
}));

vi.mock("@/services/firestore/announcements", () => ({
  listAnnouncementsByStudent: serviceMocks.listAnnouncementsByStudent,
}));

function timestamp(date: Date) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  serviceMocks.getStudent.mockImplementation(async (studentId: string) => (
    studentId === "student-1"
      ? { id: "student-1", fullName: "Nguyễn An", studentCode: "HS001" }
      : { id: "student-2", fullName: "Trần Bình", studentCode: "HS002" }
  ));
  serviceMocks.listAnnouncementsByStudent.mockImplementation(async (studentId: string) => {
    if (studentId === "student-2") {
      return [{
        id: "announcement-student-2",
        type: "homework_reminder",
        studentId,
        title: "Nhắc bài tập của Trần Bình",
        message: "Hoàn thành bài trước buổi học tiếp theo.",
        createdAt: timestamp(new Date("2026-07-30T09:00:00")),
      }];
    }
    return [
      {
        id: "announcement-old",
        type: "session_summary",
        studentId,
        title: "Tóm tắt buổi học cũ",
        message: "Nội dung cũ.",
        createdAt: timestamp(new Date("2026-07-28T09:00:00")),
      },
      {
        id: "announcement-new",
        type: "schedule_change",
        studentId,
        title: "Thay đổi lịch mới nhất",
        message: "Buổi học được chuyển sang 18:30.\nVui lòng đến trước 10 phút để chuẩn bị.",
        createdAt: timestamp(new Date("2026-07-30T09:00:00")),
      },
    ];
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ViewerAnnouncementsPage mobile workflow", () => {
  test("sorts newest first and keeps long content readable", async () => {
    renderWithQueryClient(<ViewerAnnouncementsPage />);

    await screen.findByRole("heading", { name: "Thay đổi lịch mới nhất" });
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Thay đổi lịch mới nhất",
      "Tóm tắt buổi học cũ",
    ]);
    const message = screen.getByText(/Buổi học được chuyển sang 18:30/);
    expect(message.className).toContain("whitespace-pre-wrap");
    expect(message.className).toContain("break-words");
  });

  test("isolates announcements by the selected student", async () => {
    renderWithQueryClient(<ViewerAnnouncementsPage />);

    await screen.findByRole("heading", { name: "Thay đổi lịch mới nhất" });
    fireEvent.change(screen.getByRole("combobox", { name: "Đang xem thông tin của" }), {
      target: { value: "student-2" },
    });

    expect(await screen.findByRole("heading", { name: "Nhắc bài tập của Trần Bình" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Thay đổi lịch mới nhất" })).toBeNull();
  });
});
