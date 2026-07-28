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
  createInvoice: vi.fn(),
  getPaymentSettings: vi.fn(),
  listClasses: vi.fn(),
  listCourses: vi.fn(),
  listInvoices: vi.fn(),
  listPayments: vi.fn(),
  listStudents: vi.fn(),
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
  createInvoice: serviceMocks.createInvoice,
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

async function openAndFillInvoiceForm() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Tạo hóa đơn" }),
  );
  await screen.findByRole("option", { name: "Nguyễn An" });

  fireEvent.change(screen.getByLabelText(/Học sinh/), {
    target: { value: "student-1" },
  });
  fireEvent.change(screen.getByLabelText(/Lớp học/), {
    target: { value: "class-1" },
  });
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
      { id: "class-1", name: "Lớp A1", courseId: "course-1" },
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
    serviceMocks.createInvoice.mockResolvedValue({ id: "invoice-1" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("allows an admin to publish an invoice", async () => {
    renderWithQueryClient(<InvoicesPage />);
    await openAndFillInvoiceForm();

    await waitFor(() => {
      expect(screen.getByLabelText(/Số tiền/)).toHaveProperty("value", "100000");
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Phát hành hóa đơn" }),
    );

    await waitFor(() => {
      expect(serviceMocks.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "student-1",
          courseId: "course-1",
          amount: 100_000,
          actorUid: "admin-1",
          accountNumber: "123456789",
        }),
      );
    });
  });

  test("keeps invoice input and reports a service failure", async () => {
    serviceMocks.createInvoice.mockRejectedValueOnce(new Error("offline"));
    renderWithQueryClient(<InvoicesPage />);
    await openAndFillInvoiceForm();

    fireEvent.click(
      screen.getByRole("button", { name: "Phát hành hóa đơn" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Không thể tạo hóa đơn",
      );
    });
    expect(screen.getByLabelText(/Học sinh/)).toHaveProperty(
      "value",
      "student-1",
    );
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
