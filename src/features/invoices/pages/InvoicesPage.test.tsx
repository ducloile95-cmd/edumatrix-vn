// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import InvoicesPage from "@/features/invoices/pages/InvoicesPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const authState = vi.hoisted(() => ({
  value: {
    firebaseUser: { uid: "admin-1" },
    role: "admin",
  },
}));

const serviceMocks = vi.hoisted(() => ({
  createInvoices: vi.fn(),
  getPaymentSettings: vi.fn(),
  listBillingItems: vi.fn(),
  listClasses: vi.fn(),
  listCourses: vi.fn(),
  listInvoices: vi.fn(),
  listPayments: vi.fn(),
  listStudents: vi.fn(),
  listSubjects: vi.fn(),
  reconcilePayment: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => authState.value,
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("@/services/firestore/invoices", () => ({
  createInvoices: serviceMocks.createInvoices,
  listInvoices: serviceMocks.listInvoices,
  listPayments: serviceMocks.listPayments,
  reconcilePayment: serviceMocks.reconcilePayment,
}));

vi.mock("@/services/firestore/settings", () => ({
  getPaymentSettings: serviceMocks.getPaymentSettings,
}));

vi.mock("@/services/firestore/students", () => ({
  listStudents: serviceMocks.listStudents,
}));

vi.mock("@/services/firestore/classes", () => ({
  listClasses: serviceMocks.listClasses,
}));

vi.mock("@/services/firestore/courses", () => ({
  listCourses: serviceMocks.listCourses,
}));

vi.mock("@/services/firestore/subjects", () => ({
  listSubjects: serviceMocks.listSubjects,
}));

vi.mock("@/services/firestore/billingItems", () => ({
  listBillingItems: serviceMocks.listBillingItems,
}));

async function openAndFillInvoiceForm() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Tạo hóa đơn" }),
  );
  await screen.findByText("Lớp A1");
  fireEvent.click(screen.getByRole("button", { name: "Chọn lớp học Lớp A1" }));
  fireEvent.click(screen.getByLabelText(/Nguyễn An/));
  fireEvent.change(screen.getByLabelText(/Hạn thanh toán/), {
    target: { value: "2026-08-15" },
  });
}

describe("InvoicesPage", () => {
  beforeEach(() => {
    authState.value = {
      firebaseUser: { uid: "admin-1" },
      role: "admin",
    };
    serviceMocks.listStudents.mockResolvedValue([
      { id: "student-1", fullName: "Nguyễn An" },
    ]);
    serviceMocks.listInvoices.mockResolvedValue([]);
    serviceMocks.listPayments.mockResolvedValue([]);
    serviceMocks.listClasses.mockResolvedValue([
      { id: "class-1", name: "Lớp A1", courseId: "course-1", subjectIds: ["subject-1"], studentIds: ["student-1"], status: "active" },
    ]);
    serviceMocks.listCourses.mockResolvedValue([
      {
        id: "course-1",
        name: "English Foundation",
        pricePerSession: 100_000,
        tuitionFee: 1_000_000,
        totalSessions: 10,
      },
    ]);
    serviceMocks.getPaymentSettings.mockResolvedValue({
      bankBin: "970436",
      accountNumber: "123456789",
      accountName: "EDUMATRIX",
    });
    serviceMocks.listSubjects.mockResolvedValue([{ id: "subject-1", name: "English", status: "active" }]);
    serviceMocks.listBillingItems.mockResolvedValue([{
      id: "item-1",
      name: "Giáo trình English Foundation",
      courseId: "course-1",
      subjectId: "subject-1",
      unitPrice: 250_000,
      status: "active",
    }]);
    serviceMocks.createInvoices.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("allows an admin to publish an invoice", async () => {
    renderWithQueryClient(<InvoicesPage />);
    await openAndFillInvoiceForm();

    expect(screen.getAllByText("100.000 đ").length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Tạo 1 hóa đơn" }),
    );

    await waitFor(() => {
      expect(serviceMocks.createInvoices).toHaveBeenCalledWith([
        expect.objectContaining({
          studentId: "student-1",
          courseId: "course-1",
          amount: 100_000,
          sourceType: "class",
          sourceId: "class-1",
          actorUid: "admin-1",
          accountNumber: "123456789",
        }),
      ]);
    });
  });

  test("keeps invoice input and reports a service failure", async () => {
    serviceMocks.createInvoices.mockRejectedValueOnce(new Error("offline"));
    renderWithQueryClient(<InvoicesPage />);
    await openAndFillInvoiceForm();

    fireEvent.click(
      screen.getByRole("button", { name: "Tạo 1 hóa đơn" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Không thể tạo hóa đơn",
      );
    });
    expect(screen.getByLabelText(/Nguyễn An/)).toHaveProperty("checked", true);
  });

  test("creates a learning-supply invoice for eligible students", async () => {
    renderWithQueryClient(<InvoicesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Tạo hóa đơn" }));
    fireEvent.click(screen.getByRole("tab", { name: "Đồ dùng học tập" }));
    fireEvent.click(screen.getByRole("button", { name: "Chọn đồ dùng học tập Giáo trình English Foundation" }));
    fireEvent.click(screen.getByLabelText(/Nguyễn An/));
    fireEvent.change(screen.getByLabelText(/Hạn thanh toán/), { target: { value: "2026-08-15" } });

    expect(screen.queryByLabelText(/Số buổi/)).toBeNull();
    expect(screen.getByLabelText(/Đơn giá đồ dùng/)).toHaveProperty("value", "250.000 đ");
    fireEvent.click(screen.getByRole("button", { name: "Tạo 1 hóa đơn" }));

    await waitFor(() => {
      expect(serviceMocks.createInvoices).toHaveBeenCalledWith([
        expect.objectContaining({
          studentId: "student-1",
          courseId: "course-1",
          subjectId: "subject-1",
          billingItemId: "item-1",
          sourceType: "billing_item",
          amount: 250_000,
        }),
      ]);
    });
  });

  test("does not expose invoice creation or reconciliation to a teacher", async () => {
    authState.value = {
      firebaseUser: { uid: "teacher-1" },
      role: "teacher",
    };
    renderWithQueryClient(<InvoicesPage />);

    await screen.findByText("Teacher chỉ được theo dõi");
    expect(
      screen.queryByRole("button", { name: "Tạo hóa đơn" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Đối soát" })).toBeNull();
    expect(serviceMocks.getPaymentSettings).not.toHaveBeenCalled();
  });
});
