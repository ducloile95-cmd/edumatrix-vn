import type { InvoiceDoc } from "@/types/academic";

export function safePercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export interface FinanceMetrics {
  outstandingAmount: number;
  overdueAmount: number;
  pendingCount: number;
  collectionRate: number;
  aging: { label: string; amount: number }[];
}

export function buildFinanceMetrics(invoices: (InvoiceDoc & { id: string })[], now = new Date()): FinanceMetrics {
  const outstanding = invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "rejected");
  const paidAmount = invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.amount, 0);
  const billableAmount = invoices.filter((invoice) => invoice.status !== "rejected").reduce((sum, invoice) => sum + invoice.amount, 0);
  const aging = [
    { label: "Chưa đến hạn", amount: 0 },
    { label: "1–30 ngày", amount: 0 },
    { label: "31–60 ngày", amount: 0 },
    { label: "> 60 ngày", amount: 0 },
  ];
  outstanding.forEach((invoice) => {
    const days = Math.floor((now.getTime() - invoice.dueAt.toMillis()) / 86_400_000);
    const bucket = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3;
    aging[bucket].amount += invoice.amount;
  });
  return {
    outstandingAmount: outstanding.reduce((sum, invoice) => sum + invoice.amount, 0),
    overdueAmount: outstanding.filter((invoice) => invoice.dueAt.toMillis() < now.getTime()).reduce((sum, invoice) => sum + invoice.amount, 0),
    pendingCount: invoices.filter((invoice) => invoice.status === "pending").length,
    collectionRate: safePercent(paidAmount, billableAmount),
    aging,
  };
}

export function studentRiskReasons(input: {
  attendanceRate: number;
  attendanceTotal: number;
  consecutiveAbsences: number;
  assignmentRate: number;
  assignmentTotal: number;
  recentScores: number[];
  rank: string | null;
}): string[] {
  const reasons: string[] = [];
  if (input.attendanceTotal > 0 && input.attendanceRate < 80) reasons.push("Chuyên cần dưới 80%");
  if (input.consecutiveAbsences >= 2) reasons.push("Vắng ít nhất 2 buổi liên tiếp");
  if (input.assignmentTotal > 0 && input.assignmentRate < 70) reasons.push("Hoàn thành bài tập dưới 70%");
  if (input.recentScores.length >= 3 && input.recentScores.slice(-3).every((score, index, values) => index === 0 || score < values[index - 1])) reasons.push("Điểm giảm qua 3 đánh giá gần nhất");
  if (input.rank === "D") reasons.push("Xếp hạng D");
  return reasons;
}
