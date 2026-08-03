// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BillingItemForm } from "@/features/catalog/components/BillingItemForm";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  createBillingItem: vi.fn(),
  updateBillingItem: vi.fn(),
  listCourses: vi.fn(),
  listSubjects: vi.fn(),
}));

vi.mock("@/services/firestore/billingItems", () => ({
  createBillingItem: serviceMocks.createBillingItem,
  updateBillingItem: serviceMocks.updateBillingItem,
}));
vi.mock("@/services/firestore/courses", () => ({ listCourses: serviceMocks.listCourses }));
vi.mock("@/services/firestore/subjects", () => ({ listSubjects: serviceMocks.listSubjects }));

describe("BillingItemForm", () => {
  beforeEach(() => {
    serviceMocks.listCourses.mockResolvedValue([{
      id: "course-1",
      name: "English Foundation",
      subjectIds: ["subject-1"],
      status: "active",
    }]);
    serviceMocks.listSubjects.mockResolvedValue([
      { id: "subject-1", name: "English", status: "active" },
      { id: "subject-2", name: "Math", status: "active" },
    ]);
    serviceMocks.createBillingItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("creates an item only with a subject belonging to the selected course", async () => {
    const onDone = vi.fn();
    renderWithQueryClient(<BillingItemForm onDone={onDone} />);

    await screen.findByRole("option", { name: "English Foundation" });
    fireEvent.change(await screen.findByLabelText(/Khóa học/), { target: { value: "course-1" } });
    expect(screen.queryByRole("option", { name: "Math" })).toBeNull();
    fireEvent.change(screen.getByLabelText(/Môn học/), { target: { value: "subject-1" } });
    fireEvent.change(screen.getByLabelText(/Tên đồ dùng học tập/), { target: { value: "Giáo trình English" } });
    fireEvent.change(screen.getByLabelText(/Đơn giá/), { target: { value: "250000" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm đồ dùng" }));

    await waitFor(() => expect(serviceMocks.createBillingItem).toHaveBeenCalledWith({
      name: "Giáo trình English",
      courseId: "course-1",
      subjectId: "subject-1",
      unitPrice: 250000,
      status: "active",
    }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
