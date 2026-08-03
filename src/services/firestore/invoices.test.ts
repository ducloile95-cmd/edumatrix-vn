import { beforeEach, describe, expect, test, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  batchCommit: vi.fn(),
  batchSet: vi.fn(),
  nextId: 0,
}));

vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: vi.fn((value) => value) },
  collection: vi.fn((_db, name: string) => ({ name })),
  doc: vi.fn((collectionRef: { name: string }) => ({ id: `invoice-${++firestore.nextId}`, collection: collectionRef.name })),
  getDocs: vi.fn(),
  limit: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({ set: firestore.batchSet, update: vi.fn(), commit: firestore.batchCommit })),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({
  getCurrentUserDoc: vi.fn(),
  isAdminUser: vi.fn(),
  isTeacherUser: vi.fn(),
}));
vi.mock("@/services/firestore/students", () => ({ listStudents: vi.fn() }));

import { createInvoices } from "@/services/firestore/invoices";

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
});
