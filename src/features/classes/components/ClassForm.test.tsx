// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Timestamp } from "firebase/firestore";
import { ClassForm } from "@/features/classes/components/ClassForm";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";
import type { ClassDoc } from "@/types/academic";

const authState = vi.hoisted(() => ({
  value: {
    firebaseUser: { uid: "teacher-1" },
    role: "teacher",
  },
}));

const serviceMocks = vi.hoisted(() => ({
  createClass: vi.fn(),
  createClassWithSchedule: vi.fn(),
  updateClass: vi.fn(),
  listCourses: vi.fn(),
  listSubjects: vi.fn(),
  listTeachers: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => authState.value,
}));

vi.mock("@/services/firestore/classes", () => ({
  createClass: serviceMocks.createClass,
  createClassWithSchedule: serviceMocks.createClassWithSchedule,
  updateClass: serviceMocks.updateClass,
}));

vi.mock("@/services/firestore/courses", () => ({
  listCourses: serviceMocks.listCourses,
}));

vi.mock("@/services/firestore/subjects", () => ({
  listSubjects: serviceMocks.listSubjects,
}));

vi.mock("@/services/firestore/users", () => ({
  listUsersByRole: serviceMocks.listTeachers,
}));

async function fillValidClassForm() {
  await screen.findByRole("option", { name: "English Foundation" });
  fireEvent.change(screen.getByLabelText(/Tên lớp/), {
    target: { value: "Lớp A1" },
  });
  fireEvent.change(screen.getByLabelText(/Khóa học/), {
    target: { value: "course-1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Môn học *" }));
  fireEvent.click(await screen.findByRole("option", { name: "Tiếng Anh" }));
}

describe("ClassForm", () => {
  beforeEach(() => {
    authState.value = {
      firebaseUser: { uid: "teacher-1" },
      role: "teacher",
    };
    serviceMocks.listCourses.mockResolvedValue([
      {
        id: "course-1",
        name: "English Foundation",
        status: "active",
        subjectIds: ["subject-1"],
        teacherIds: ["teacher-1"],
      },
    ]);
    serviceMocks.listSubjects.mockResolvedValue([
      { id: "subject-1", name: "Tiếng Anh", status: "active" },
    ]);
    serviceMocks.listTeachers.mockResolvedValue([
      { uid: "teacher-1", displayName: "Cô An" },
    ]);
    serviceMocks.createClass.mockResolvedValue(undefined);
    serviceMocks.createClassWithSchedule.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("blocks an empty class form with validation messages", async () => {
    renderWithQueryClient(<ClassForm />);
    fireEvent.click(
      screen.getByRole("button", { name: "Tạo lớp học" }),
    );

    await waitFor(() => {
      expect(screen.getAllByRole("alert")).toHaveLength(3);
    });
    expect(serviceMocks.createClass).not.toHaveBeenCalled();
  });

  test("creates a teacher-owned class and ignores arbitrary teacher assignment", async () => {
    const onDone = vi.fn();
    renderWithQueryClient(<ClassForm onDone={onDone} />);
    await fillValidClassForm();

    fireEvent.click(
      screen.getByRole("button", { name: "Tạo lớp học" }),
    );

    await waitFor(() => {
      expect(serviceMocks.createClass).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Lớp A1",
          courseId: "course-1",
          subjectIds: ["subject-1"],
          teacherIds: ["teacher-1"],
        }),
      );
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  test("keeps the form visible and reports a save failure", async () => {
    serviceMocks.createClass.mockRejectedValueOnce(new Error("offline"));
    renderWithQueryClient(<ClassForm />);
    await fillValidClassForm();

    fireEvent.click(
      screen.getByRole("button", { name: "Tạo lớp học" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Không thể lưu lớp học",
      );
    });
    expect(screen.getByLabelText(/Tên lớp/)).toHaveProperty("value", "Lớp A1");
  });

  test("creates an admin class with the interactive recurring schedule", async () => {
    authState.value = {
      firebaseUser: { uid: "admin-1" },
      role: "admin",
    };
    renderWithQueryClient(<ClassForm />);
    await fillValidClassForm();

    expect(screen.queryByLabelText("Tự động sinh lịch")).toBeNull();
    expect(screen.getByText("Mặc định bật")).toBeTruthy();
    expect(screen.getByTestId("class-form-layout").className).toContain("xl:overflow-hidden");
    fireEvent.change(screen.getByLabelText(/Ngày bắt đầu/), { target: { value: "2026-08-03" } });
    fireEvent.change(screen.getByLabelText(/^Bắt đầu/), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText(/^Kết thúc/), { target: { value: "19:30" } });
    fireEvent.change(screen.getByLabelText(/Tổng số buổi/), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo lớp học" }));

    await waitFor(() => {
      expect(serviceMocks.createClassWithSchedule).toHaveBeenCalledWith(expect.objectContaining({
        name: "Lớp A1",
        recurrence: expect.objectContaining({
          daysOfWeek: [2, 4],
          startTime: "18:00",
          endTime: "19:30",
          sessionCount: 12,
        }),
      }));
    });
    expect(serviceMocks.createClass).not.toHaveBeenCalled();
  });

  test("uses the same fixed layout for editing and displays the saved smart schedule", async () => {
    authState.value = {
      firebaseUser: { uid: "admin-1" },
      role: "admin",
    };
    const editingClass: ClassDoc & { id: string } = {
      id: "class-1",
      name: "Lớp A1",
      courseId: "course-1",
      subjectIds: ["subject-1"],
      teacherIds: ["teacher-1"],
      studentIds: [],
      scheduleText: "Thứ 3, Thứ 5 · 18:00-19:30",
      location: "Phòng 201",
      status: "active",
      recurrence: {
        startDate: Timestamp.fromDate(new Date("2026-07-01T00:00:00")),
        endDate: Timestamp.fromDate(new Date("2026-08-08T00:00:00")),
        daysOfWeek: [2, 4],
        startTime: "18:00",
        endTime: "19:30",
        sessionCount: 12,
      },
      createdAt: Timestamp.fromDate(new Date("2026-06-01T00:00:00")),
      updatedAt: Timestamp.fromDate(new Date("2026-06-01T00:00:00")),
    };

    renderWithQueryClient(<ClassForm editingClass={editingClass} />);
    await screen.findByRole("option", { name: "English Foundation" });

    expect(screen.getByTestId("class-form-layout").className).toContain("xl:overflow-hidden");
    expect(screen.getByLabelText(/Ngày bắt đầu/)).toHaveProperty("value", "2026-07-01");
    expect(screen.getByLabelText(/Ngày bắt đầu/)).toHaveProperty("disabled", true);
    expect(screen.queryByLabelText("Tự động sinh lịch")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => {
      expect(serviceMocks.updateClass).toHaveBeenCalledWith("class-1", expect.objectContaining({
        name: "Lớp A1",
        subjectIds: ["subject-1"],
        teacherIds: ["teacher-1"],
      }));
    });
  });
});
