// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ViewerSchedulePage from "@/features/dashboard/pages/ViewerSchedulePage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  getClass: vi.fn(),
  getStudent: vi.fn(),
  listSessionsByClass: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ userDoc: { studentIds: ["student-1", "student-2"] } }),
}));

vi.mock("@/services/firestore/students", () => ({
  getStudent: serviceMocks.getStudent,
}));

vi.mock("@/services/firestore/classes", () => ({
  getClass: serviceMocks.getClass,
}));

vi.mock("@/services/firestore/sessions", () => ({
  listSessionsByClass: serviceMocks.listSessionsByClass,
}));

function timestamp(date: Date) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

function session(id: string, classId: string, hour: number) {
  const start = new Date();
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1);
  return {
    id,
    classId,
    title: "Buổi học",
    startAt: timestamp(start),
    endAt: timestamp(end),
    location: "Phòng 201",
    status: "scheduled",
    note: "",
    makeUpForSessionId: null,
    createdAt: timestamp(start),
    updatedAt: timestamp(start),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  serviceMocks.getStudent.mockImplementation(async (studentId: string) => (
    studentId === "student-1"
      ? { id: "student-1", fullName: "Nguyễn An", studentCode: "HS001", currentClassIds: ["class-1"] }
      : { id: "student-2", fullName: "Trần Bình", studentCode: "HS002", currentClassIds: ["class-2"] }
  ));
  serviceMocks.getClass.mockImplementation(async (classId: string) => ({
    id: classId,
    name: classId === "class-1" ? "Lớp Toán A" : "Lớp Anh B",
  }));
  serviceMocks.listSessionsByClass.mockImplementation(async (classId: string) => (
    classId === "class-1"
      ? [session("session-1", "class-1", 18)]
      : [session("session-2", "class-2", 19)]
  ));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ViewerSchedulePage mobile workflow", () => {
  test("shows a touch-friendly day list and opens session details with the keyboard-safe modal", async () => {
    renderWithQueryClient(<ViewerSchedulePage />);

    const sessionButton = await findMobileSessionButton("Lớp Toán A");
    expect(sessionButton.className).toContain("min-h-touch");
    expect(sessionButton.className).toContain("w-full");
    expect(screen.getByText("Theo tuần").closest("button")?.getAttribute("aria-selected")).toBe("true");

    sessionButton.focus();
    fireEvent.click(sessionButton);
    await screen.findByText("Đã lên lịch");
    const dialog = document.querySelector<HTMLElement>("[role='dialog']");
    expect(dialog).not.toBeNull();
    expect(dialog!.className).toContain("rounded-t-modal");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(sessionButton).toBe(document.activeElement));
  });

  test("uses the shared persisted student selection", async () => {
    renderWithQueryClient(<ViewerSchedulePage />);

    await findMobileSessionButton("Lớp Toán A");
    fireEvent.change(screen.getByRole("combobox", { name: "Đang xem thông tin của" }), {
      target: { value: "student-2" },
    });

    expect(await findMobileSessionButton("Lớp Anh B")).toBeTruthy();
    expect(screen.queryAllByText("Lớp Toán A")).toHaveLength(0);
    expect(window.localStorage.getItem("edumatrix.viewer.selectedStudentId")).toBe("student-2");
  });
});

async function findMobileSessionButton(className: string) {
  const labels = await screen.findAllByText(className);
  const button = labels
    .map((label) => label.closest("button"))
    .find((candidate) => candidate?.className.includes("w-full"));
  if (!button) throw new Error(`Không tìm thấy thẻ lịch mobile cho ${className}.`);
  return button;
}
