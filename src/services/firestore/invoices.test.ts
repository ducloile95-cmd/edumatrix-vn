import { beforeEach, describe, expect, test, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  getCurrentUserDoc: vi.fn(),
  getDocs: vi.fn(),
  isAdminUser: vi.fn(),
  isTeacherUser: vi.fn(),
  nextId: 0,
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: vi.fn((value) => value) },
  collection: vi.fn((_db, name: string) => ({ name })),
  doc: vi.fn((...args: unknown[]) => args.length === 1
    ? { id: `invoice-${++firestore.nextId}`, collection: (args[0] as { name: string }).name }
    : { id: args[2], path: `${args[1]}/${args[2]}` }),
  getDocs: firestore.getDocs,
  documentId: vi.fn(() => "__name__"),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: firestore.runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
  startAfter: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({ set: firestore.batchSet, update: vi.fn(), commit: firestore.batchCommit })),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({
  getCurrentUserDoc: firestore.getCurrentUserDoc,
  isAdminUser: firestore.isAdminUser,
  isTeacherUser: firestore.isTeacherUser,
}));
vi.mock("@/services/firestore/students", () => ({ listStudents: vi.fn() }));

import { createInvoices, listInvoices, reconcilePayment, reportPayment } from "@/services/firestore/invoices";

const baseInput = {
  courseId: "course-1",
  title: "Đồ dùng học tập",
  amount: 1_000_000,
  dueAt: new Date("2026-08-15T00:00:00"),
  bankBin: "970436",
  accountNumber: "123456789",
  accountName: "EDUMATRIX",
  actorUid: "admin-1",
  sourceType: "billing_item" as const,
  sourceId: "item-1",
  classId: null,
  subjectId: "subject-1",
  billingItemId: "item-1",
  itemNameSnapshot: "Giáo trình",
  unitPriceSnapshot: 1_000_000,
  quantity: 1,
};

describe("createInvoices", () => {
  beforeEach(() => {
    firestore.nextId = 0;
    firestore.batchSet.mockReset();
    firestore.batchCommit.mockReset().mockResolvedValue(undefined);
    firestore.transactionGet.mockReset();
    firestore.transactionSet.mockReset();
    firestore.transactionUpdate.mockReset();
    firestore.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: firestore.transactionGet,
      set: firestore.transactionSet,
      update: firestore.transactionUpdate,
    }));
  });

  test("writes all student invoices in one batch", async () => {
    await createInvoices([
      { ...baseInput, studentId: "student-1" },
      { ...baseInput, studentId: "student-2" },
    ]);

    expect(firestore.batchSet).toHaveBeenCalledTimes(2);
    expect(firestore.batchSet).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "invoice-1" }), expect.objectContaining({
      studentId: "student-1",
      courseId: "course-1",
      amount: 1_000_000,
      status: "unpaid",
      createdBy: "admin-1",
      sourceType: "billing_item",
    }));
    expect(firestore.batchSet.mock.calls[0][1]).not.toHaveProperty("actorUid");
    expect(firestore.batchCommit).toHaveBeenCalledTimes(1);
  });

  test("rejects a batch larger than the Firestore limit", async () => {
    await expect(createInvoices(Array.from({ length: 501 }, (_, index) => ({
      ...baseInput,
      studentId: `student-${index}`,
    })))).rejects.toThrow("invoice_batch_limit");
    expect(firestore.batchCommit).not.toHaveBeenCalled();
  });

  test("lists every invoice page for an admin", async () => {
    const invoice = (id: string) => ({ id, data: () => ({ invoiceCode: id }) });
    firestore.getCurrentUserDoc.mockResolvedValue({ role: "admin" });
    firestore.isAdminUser.mockReturnValue(true);
    firestore.isTeacherUser.mockReturnValue(false);
    firestore.getDocs.mockReset()
      .mockResolvedValueOnce({ docs: Array.from({ length: 300 }, (_, index) => invoice(`I${index}`)), size: 300 })
      .mockResolvedValueOnce({ docs: [invoice("I300")], size: 1 });

    await expect(listInvoices()).resolves.toHaveLength(301);
    expect(firestore.getDocs).toHaveBeenCalledTimes(2);
  });

  test("reconciles only a current reported payment against its pending invoice", async () => {
    firestore.transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ invoiceId: "invoice-1", studentId: "student-1", amount: 1_000_000, status: "reported" }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ studentId: "student-1", amount: 1_000_000, status: "pending" }) });

    await reconcilePayment({ id: "payment-1" } as never, "verified", "admin-1");

    expect(firestore.transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: "payments/payment-1" }), expect.objectContaining({ status: "verified" }));
    expect(firestore.transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: "invoices/invoice-1" }), expect.objectContaining({ status: "paid" }));
  });

  test("reports payment from the live invoice instead of stale UI data", async () => {
    firestore.transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ studentId: "student-live", amount: 2_000_000, status: "unpaid" }) })
      .mockResolvedValueOnce({ exists: () => false });

    await reportPayment({ id: "invoice-1", studentId: "student-stale", amount: 1 } as never, "viewer-1", "REF", "Note");

    expect(firestore.transactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("payments/") }),
      expect.objectContaining({ studentId: "student-live", amount: 2_000_000, status: "reported" }),
      { merge: true },
    );
    expect(firestore.transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "invoices/invoice-1" }),
      expect.objectContaining({ status: "pending" }),
    );
  });

  test("rejects reporting an invoice that is already pending", async () => {
    firestore.transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ studentId: "student-1", amount: 1_000_000, status: "pending" }) })
      .mockResolvedValueOnce({ exists: () => false });

    await expect(reportPayment({ id: "invoice-1" } as never, "viewer-1", "REF", "Note"))
      .rejects.toThrow("INVOICE_NOT_REPORTABLE");
    expect(firestore.transactionSet).not.toHaveBeenCalled();
  });

  test("rejects a payment that another admin already reconciled", async () => {
    firestore.transactionGet.mockResolvedValueOnce({ exists: () => true, data: () => ({ status: "verified" }) });

    await expect(reconcilePayment({ id: "payment-1" } as never, "rejected", "admin-2"))
      .rejects.toThrow("PAYMENT_ALREADY_RECONCILED");
    expect(firestore.transactionUpdate).not.toHaveBeenCalled();
  });
});
