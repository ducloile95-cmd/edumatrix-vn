import { describe, expect, test } from "vitest";
import { effectiveInvoiceStatus } from "@/features/invoices/invoiceStatus";

// Ngay Viet Nam: 2026-11-23T10:00+07:00 = 03:00Z
const now = new Date("2026-11-23T03:00:00.000Z");
const due = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => new Date(iso).getTime() }) as never;

describe("effectiveInvoiceStatus", () => {
  test("unpaid becomes overdue only after the due day (Vietnam time)", () => {
    expect(effectiveInvoiceStatus({ status: "unpaid", dueAt: due("2026-11-22T17:00:00.000Z") }, now)).toBe("unpaid"); // han 23/11 VN
    expect(effectiveInvoiceStatus({ status: "unpaid", dueAt: due("2026-11-21T17:00:00.000Z") }, now)).toBe("overdue"); // han 22/11 VN
  });
  test("paid, pending, rejected and void keep their status", () => {
    for (const status of ["paid", "pending", "rejected", "void"] as const) {
      expect(effectiveInvoiceStatus({ status, dueAt: due("2026-01-01T00:00:00.000Z") }, now)).toBe(status);
    }
  });
});
