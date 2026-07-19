import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { buildFinanceMetrics, safePercent, studentRiskReasons } from "@/utils/dashboardMetrics";
import type { InvoiceDoc } from "@/types/academic";

function invoice(id: string, amount: number, status: InvoiceDoc["status"], dueAt: Date): InvoiceDoc & { id: string } {
  const timestamp = Timestamp.fromDate(dueAt);
  return { id, invoiceCode: id, studentId: "s1", courseId: null, title: id, amount, dueAt: timestamp, paymentContent: "", bankBin: "", accountNumber: "", accountName: "", status, createdBy: "a", createdAt: timestamp, updatedAt: timestamp };
}

describe("dashboard metrics", () => {
  it("khong tao NaN khi mau so bang 0", () => expect(safePercent(2, 0)).toBe(0));

  it("tinh cong no, ty le thu va tuoi no", () => {
    const now = new Date("2026-07-19T00:00:00Z");
    const result = buildFinanceMetrics([
      invoice("paid", 100, "paid", new Date("2026-07-01T00:00:00Z")),
      invoice("late", 200, "overdue", new Date("2026-06-01T00:00:00Z")),
      invoice("future", 100, "unpaid", new Date("2026-08-01T00:00:00Z")),
    ], now);
    expect(result.outstandingAmount).toBe(300);
    expect(result.overdueAmount).toBe(200);
    expect(result.collectionRate).toBe(25);
    expect(result.aging.find((item) => item.label === "31–60 ngày")?.amount).toBe(200);
  });

  it("hien thi tung nguyen nhan rui ro, khong gom thanh diem mo ho", () => {
    expect(studentRiskReasons({ attendanceRate: 70, attendanceTotal: 10, consecutiveAbsences: 2, assignmentRate: 60, assignmentTotal: 5, recentScores: [90, 80, 70], rank: "D" })).toHaveLength(5);
  });

  it("khong canh bao ty le khi chua co du lieu", () => {
    expect(studentRiskReasons({ attendanceRate: 0, attendanceTotal: 0, consecutiveAbsences: 0, assignmentRate: 0, assignmentTotal: 0, recentScores: [], rank: null })).toEqual([]);
  });
});
