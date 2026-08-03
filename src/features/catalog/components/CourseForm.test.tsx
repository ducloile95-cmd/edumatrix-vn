// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { CourseForm } from "@/features/catalog/components/CourseForm";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";
import { calculateCourseEndDate } from "@/utils/courseDates";

const serviceMocks = vi.hoisted(() => ({
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  listSubjects: vi.fn(),
  listUsersByRole: vi.fn(),
}));

vi.mock("@/services/firestore/courses", () => ({
  createCourse: serviceMocks.createCourse,
  updateCourse: serviceMocks.updateCourse,
}));
vi.mock("@/services/firestore/subjects", () => ({ listSubjects: serviceMocks.listSubjects }));
vi.mock("@/services/firestore/users", () => ({ listUsersByRole: serviceMocks.listUsersByRole }));

describe("CourseForm horizontal workflow", () => {
  beforeEach(() => {
    serviceMocks.createCourse.mockResolvedValue(undefined);
    serviceMocks.updateCourse.mockResolvedValue(undefined);
    serviceMocks.listSubjects.mockResolvedValue([
      { id: "math", name: "Toán", status: "active" },
      { id: "english", name: "Tiếng Anh", status: "active" },
    ]);
    serviceMocks.listUsersByRole.mockResolvedValue([
      { uid: "teacher-1", displayName: "Cô An", status: "active" },
      { uid: "teacher-2", displayName: "Thầy Bình", status: "active" },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("calculates the inclusive end date from the start date and session count", () => {
    expect(calculateCourseEndDate("2026-08-10", 5)).toBe("2026-08-14");
    expect(calculateCourseEndDate("2026-08-10", 1)).toBe("2026-08-10");
    expect(calculateCourseEndDate("", 5)).toBe("");
  });

  test("selects multiple subjects and teachers, then submits the calculated dates", async () => {
    const onDone = vi.fn();
    renderWithQueryClient(<CourseForm onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: /Môn học/ }));
    const subjectList = await screen.findByRole("listbox", { name: /Môn học/ });
    fireEvent.click(within(subjectList).getByRole("option", { name: "Toán" }));
    fireEvent.click(within(subjectList).getByRole("option", { name: "Tiếng Anh" }));
    fireEvent.click(screen.getByRole("button", { name: "Xong" }));

    fireEvent.click(screen.getByRole("button", { name: /Giáo viên phụ trách/ }));
    const teacherList = await screen.findByRole("listbox", { name: /Giáo viên phụ trách/ });
    fireEvent.click(within(teacherList).getByRole("option", { name: "Cô An" }));
    fireEvent.click(within(teacherList).getByRole("option", { name: "Thầy Bình" }));
    fireEvent.click(screen.getByRole("button", { name: "Xong" }));

    fireEvent.change(screen.getByLabelText(/Tên khóa học/), { target: { value: "Khóa tăng cường" } });
    fireEvent.change(screen.getByLabelText(/Học phí/), { target: { value: "150000" } });
    fireEvent.change(screen.getByLabelText(/Tổng số buổi/), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "active" } });

    expect(screen.queryByLabelText(/Ngày bắt đầu/)).toBeNull();
    expect(screen.queryByLabelText(/Ngày kết thúc/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Thêm khóa học" }));

    const expectedStartDate = format(new Date(), "yyyy-MM-dd");
    await waitFor(() => expect(serviceMocks.createCourse).toHaveBeenCalledWith(expect.objectContaining({
      name: "Khóa tăng cường",
      subjectIds: ["math", "english"],
      teacherIds: ["teacher-1", "teacher-2"],
      totalSessions: 5,
      startDate: expectedStartDate,
      endDate: calculateCourseEndDate(expectedStartDate, 5),
      status: "active",
    })));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("recalculates hidden dates when the session count changes during editing", async () => {
    renderWithQueryClient(<CourseForm editingCourse={{
      id: "course-1",
      name: "Khóa hiện có",
      subjectIds: ["math"],
      teacherIds: ["teacher-1"],
      pricePerSession: 100000,
      tuitionFee: 1200000,
      totalSessions: 12,
      startDate: Timestamp.fromDate(new Date("2026-07-01T00:00:00")),
      endDate: Timestamp.fromDate(new Date("2026-08-08T00:00:00")),
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }} />);

    expect(screen.queryByLabelText(/Ngày bắt đầu/)).toBeNull();
    expect(screen.queryByLabelText(/Ngày kết thúc/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Tổng số buổi/), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(serviceMocks.updateCourse).toHaveBeenCalledWith("course-1", expect.objectContaining({
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      totalSessions: 2,
      status: "active",
    })));
  });
});
