// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RegisterLeaveForm } from "@/features/attendance/components/RegisterLeaveForm";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  listClasses: vi.fn(),
  listSessionsByClass: vi.fn(),
  listStudents: vi.fn(),
  registerLeave: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ firebaseUser: { uid: "teacher-1" } }),
}));
vi.mock("@/services/firestore/classes", () => ({ listClasses: serviceMocks.listClasses }));
vi.mock("@/services/firestore/students", () => ({ listStudents: serviceMocks.listStudents }));
vi.mock("@/services/firestore/sessions", () => ({ listSessionsByClass: serviceMocks.listSessionsByClass }));
vi.mock("@/services/firestore/attendance", () => ({ registerLeave: serviceMocks.registerLeave }));

function timestamp(value: string) {
  const date = new Date(value);
  return { toDate: () => date, toMillis: () => date.getTime() };
}

beforeEach(() => {
  serviceMocks.listStudents.mockResolvedValue([{
    id: "student-1",
    fullName: "Nguyễn An",
    studentCode: "HS001",
    currentClassIds: ["class-1", "class-2"],
  }]);
  serviceMocks.listClasses.mockResolvedValue([
    { id: "class-1", name: "Toán 7A" },
    { id: "class-2", name: "Anh văn 7A" },
  ]);
  serviceMocks.listSessionsByClass.mockImplementation(async (classId: string) => classId === "class-2" ? [{
    id: "session-2",
    classId,
    title: "Anh văn 7A",
    startAt: timestamp("2026-08-03T18:00:00+07:00"),
    endAt: timestamp("2026-08-03T19:30:00+07:00"),
  }] : []);
  serviceMocks.registerLeave.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RegisterLeaveForm multi-class student", () => {
  test("requires the operator to choose the correct class before the session", async () => {
    renderWithQueryClient(<RegisterLeaveForm />);

    await screen.findByRole("option", { name: /Nguy/ });
    const studentSelect = await screen.findByLabelText(/^Học sinh/);
    fireEvent.change(studentSelect, { target: { value: "student-1" } });
    expect((studentSelect as HTMLSelectElement).value).toBe("student-1");
    const classSelect = await screen.findByLabelText(/^Lớp học/);
    await waitFor(() => expect(classSelect.querySelector('option[value="class-2"]')).not.toBeNull());
    expect((classSelect as HTMLSelectElement).value).toBe("");

    fireEvent.change(classSelect, { target: { value: "class-2" } });
    const sessionSelect = screen.getByLabelText(/Buổi học/);
    await waitFor(() => expect(sessionSelect.querySelector('option[value="session-2"]')).not.toBeNull());
    fireEvent.change(sessionSelect, { target: { value: "session-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu đăng ký" }));

    await waitFor(() => expect(serviceMocks.registerLeave).toHaveBeenCalledWith(
      "session-2",
      "class-2",
      "student-1",
      "excused",
      "",
      "teacher-1",
    ));
  });
});
