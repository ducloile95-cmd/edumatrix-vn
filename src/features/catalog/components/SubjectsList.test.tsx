// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SubjectsList } from "@/features/catalog/components/SubjectsList";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  deleteSubject: vi.fn(),
  listSubjects: vi.fn(),
  setSubjectStatus: vi.fn(),
  listCourses: vi.fn(),
  inspectDeletionDependencies: vi.fn(),
}));

vi.mock("@/services/firestore/subjects", () => ({
  deleteSubject: serviceMocks.deleteSubject,
  listSubjects: serviceMocks.listSubjects,
  setSubjectStatus: serviceMocks.setSubjectStatus,
}));
vi.mock("@/services/firestore/courses", () => ({ listCourses: serviceMocks.listCourses }));
vi.mock("@/services/firestore/deletionDependencies", () => ({ inspectDeletionDependencies: serviceMocks.inspectDeletionDependencies }));

describe("SubjectsList information layout", () => {
  beforeEach(() => {
    serviceMocks.listSubjects.mockResolvedValue([
      { id: "handwriting", name: "Luyện chữ đẹp Tiểu học & THCS", code: "LC0001", status: "active" },
      { id: "reading", name: "Tập đọc & Tập viết tiền tiểu học", code: "TTH0001", status: "archived" },
    ]);
    serviceMocks.listCourses.mockResolvedValue([
      { id: "course-1", subjectIds: ["handwriting"] },
    ]);
    serviceMocks.setSubjectStatus.mockResolvedValue(undefined);
    serviceMocks.deleteSubject.mockResolvedValue(undefined);
    serviceMocks.inspectDeletionDependencies.mockResolvedValue({ allowed: true, total: 0, blockers: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("aligns subject metadata into labeled columns and preserves row actions", async () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onSelect = vi.fn();
    renderWithQueryClient(
      <SubjectsList onAdd={onAdd} onEdit={onEdit} onSelect={onSelect} selectedSubjectId={null} />,
    );

    const table = await screen.findByRole("table", { name: "Danh sách môn học" });
    expect(within(table).getByRole("columnheader", { name: "Môn học" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Trạng thái" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Khóa học" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Thao tác" })).toBeTruthy();

    const firstRow = screen.getByText("LC0001").closest('[role="row"]');
    expect(firstRow).toBeTruthy();
    const row = within(firstRow as HTMLElement);
    expect(row.getByText("Đang dùng")).toBeTruthy();
    expect(row.getAllByRole("cell")[2].textContent).toContain("1");

    fireEvent.click(row.getByRole("button", { name: /^Luyện chữ đẹp Tiểu học & THCSLC0001$/ }));
    expect(onSelect).toHaveBeenCalledWith("handwriting");

    fireEvent.click(row.getByRole("button", { name: "Sửa" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "handwriting" }));

    fireEvent.click(row.getByRole("button", { name: "Lưu trữ" }));
    await waitFor(() => expect(serviceMocks.setSubjectStatus).toHaveBeenCalledWith("handwriting", "archived"));

    fireEvent.click(row.getByRole("button", { name: "Xóa vĩnh viễn môn học Luyện chữ đẹp Tiểu học & THCS" }));
    const confirmDelete = screen.getByRole("button", { name: "Xóa vĩnh viễn" });
    await waitFor(() => expect((confirmDelete as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirmDelete);
    await waitFor(() => expect(serviceMocks.deleteSubject).toHaveBeenCalledWith("handwriting", expect.anything()));
  });

  test("gives Teacher delete-only actions without Admin subject controls", async () => {
    renderWithQueryClient(
      <SubjectsList canManage={false} canDelete onAdd={vi.fn()} onEdit={vi.fn()} onSelect={vi.fn()} selectedSubjectId={null} />,
    );

    expect(await screen.findByRole("button", { name: "Xóa vĩnh viễn môn học Luyện chữ đẹp Tiểu học & THCS" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thêm môn học" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sửa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lưu trữ" })).toBeNull();
  });
});
