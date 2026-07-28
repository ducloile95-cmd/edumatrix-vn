// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ClassForm } from "@/features/classes/components/ClassForm";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

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
  fireEvent.click(
    await screen.findByRole("button", { name: "Tiếng Anh" }),
  );
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
});
