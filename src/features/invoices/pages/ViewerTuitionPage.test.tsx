// @vitest-environment jsdom

import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ViewerTuitionPage from "@/features/invoices/pages/ViewerTuitionPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  getStudent: vi.fn(),
  listInvoicesByStudents: vi.fn(),
  reportPayment: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    firebaseUser: { uid: "viewer-1" },
    userDoc: { studentIds: ["student-1", "student-2"] },
  }),
}));

vi.mock("@/services/firestore/students", () => ({
  getStudent: serviceMocks.getStudent,
}));

vi.mock("@/services/firestore/invoices", () => ({
  listInvoicesByStudents: serviceMocks.listInvoicesByStudents,
  reportPayment: serviceMocks.reportPayment,
}));

vi.mock("@/utils/payment", () => ({
  buildVietQrImageUrl: () => "https://example.com/payment-qr.png",
}));

function timestamp(date: Date) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

function invoice(overrides: Record<string, unknown>) {
  const date = timestamp(new Date("2026-08-15T12:00:00"));
  return {
    id: "invoice-default",
    invoiceCode: "HP-DEFAULT",
    studentId: "student-1",
    courseId: null,
    title: "Học phí mặc định",
    amount: 1_000_000,
    dueAt: date,
    paymentContent: "HP DEFAULT",
    bankBin: "970436",
    accountNumber: "123456789",
    accountName: "EDUMATRIX",
    status: "unpaid",
    createdBy: "admin-1",
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  serviceMocks.getStudent.mockImplementation(async (studentId: string) => (
    studentId === "student-1"
      ? { id: "student-1", fullName: "Nguyễn An", studentCode: "HS001", currentClassIds: [] }
      : { id: "student-2", fullName: "Trần Bình", studentCode: "HS002", currentClassIds: [] }
  ));
  serviceMocks.listInvoicesByStudents.mockResolvedValue([
    invoice({
      id: "invoice-paid",
      invoiceCode: "HP-PAID",
      title: "Học phí đã thanh toán",
      status: "paid",
    }),
    invoice({
      id: "invoice-overdue",
      invoiceCode: "HP-OVERDUE",
      title: "Học phí quá hạn",
      amount: 2_000_000,
      status: "overdue",
    }),
    invoice({
      id: "invoice-second-student",
      invoiceCode: "HP-STUDENT-2",
      studentId: "student-2",
      title: "Học phí của Trần Bình",
      amount: 3_000_000,
    }),
  ]);
  serviceMocks.reportPayment.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ViewerTuitionPage mobile workflow", () => {
  test("prioritizes actionable invoices and isolates each student's tuition", async () => {
    renderWithQueryClient(<ViewerTuitionPage />);

    await screen.findByRole("heading", { name: "Học phí quá hạn" });
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Học phí quá hạn",
      "Học phí đã thanh toán",
    ]);
    expect(screen.queryByRole("heading", { name: "Học phí của Trần Bình" })).toBeNull();
    expect(screen.getAllByText("2.000.000 đ").length).toBeGreaterThan(0);

    const switcher = screen.getByRole("combobox", { name: "Đang xem thông tin của" });
    fireEvent.change(switcher, { target: { value: "student-2" } });

    expect(await screen.findByRole("heading", { name: "Học phí của Trần Bình" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Học phí quá hạn" })).toBeNull();
    expect(window.localStorage.getItem("edumatrix.viewer.selectedStudentId")).toBe("student-2");
  });

  test("keeps the QR action touch-friendly and confirms a payment report", async () => {
    renderWithQueryClient(<ViewerTuitionPage />);

    const overdueHeading = await screen.findByRole("heading", { name: "Học phí quá hạn" });
    const overdueCard = overdueHeading.closest("article");
    const openButton = within(overdueCard!).getByRole("button", { name: "Mở mã QR" });
    expect(openButton.className).toContain("min-h-touch");
    expect(openButton.className).toContain("w-full");

    fireEvent.click(openButton);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Mã giao dịch"), { target: { value: "REF-123" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tôi đã chuyển khoản" }));

    expect((await within(dialog).findByRole("status")).textContent).toContain("Đã ghi nhận báo chuyển khoản");
    expect(serviceMocks.reportPayment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "invoice-overdue" }),
      "viewer-1",
      "REF-123",
      "",
    );
    expect(within(dialog).queryByRole("button", { name: "Tôi đã chuyển khoản" })).toBeNull();
  });
});
