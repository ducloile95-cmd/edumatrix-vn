// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SessionDetailModal } from "@/features/sessions/components/SessionDetailModal";
import type { TimetableSession } from "@/features/sessions/components/TimetableGrid";
import type { StudentDoc } from "@/types/academic";

afterEach(cleanup);

const startAt = new Date(2026, 7, 12, 8, 0);
const timestamp = Timestamp.fromDate(startAt);
const session: TimetableSession = {
  id: "session-1",
  classId: "class-1",
  className: "Tiền tiểu học - A 2026",
  courseName: "Tiền tiểu học 2026",
  teacherNames: ["Quỳnh Chi Nguyễn"],
  classLocation: "TAC - 1711 CT2B",
  title: "Buổi 3",
  startAt: timestamp,
  endAt: Timestamp.fromDate(new Date(2026, 7, 12, 9, 25)),
  location: "TAC - 1711 CT2B",
  status: "scheduled",
  note: "Chuẩn bị học liệu.",
  makeUpForSessionId: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

function student(id: string, fullName: string): StudentDoc & { id: string } {
  return {
    id,
    studentCode: id,
    fullName,
    dateOfBirth: "2020-01-01",
    parentUids: [],
    currentClassIds: ["class-1"],
    teacherIds: [],
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("SessionDetailModal staff workflow", () => {
  test("shows real class students, filters them, and keeps existing session actions", () => {
    const onStatusChange = vi.fn();
    render(
      <MemoryRouter>
        <SessionDetailModal
          session={session}
          students={[student("HS001", "Nguyễn Gia Minh"), student("HS021", "Lê Khánh Linh")]}
          onClose={vi.fn()}
          onStatusChange={onStatusChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Danh sách học sinh" })).toBeTruthy();
    expect(screen.getByRole("dialog").className).toContain("sm:w-[calc(100vw-2rem)]");
    expect(screen.getByRole("dialog").className).toContain("xl:max-w-[1280px]");
    expect(screen.getByText("Nguyễn Gia Minh")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Điểm danh" }).getAttribute("href")).toBe("/app/attendance?session=session-1");
    expect(screen.getByRole("link", { name: "Mở sổ lớp" }).getAttribute("href")).toBe("/app/classroom/session-1");

    fireEvent.change(screen.getByPlaceholderText("Tìm theo tên hoặc mã học sinh"), { target: { value: "Khánh" } });
    expect(screen.queryByText("Nguyễn Gia Minh")).toBeNull();
    expect(screen.getByText("Lê Khánh Linh")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "completed" } });
    expect(onStatusChange).toHaveBeenCalledWith("session-1", "completed");
  });
});
