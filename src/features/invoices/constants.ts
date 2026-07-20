import type { InvoiceStatus } from "@/types/academic";

// Nhãn/tone trạng thái hóa đơn dùng chung cho trang Staff (InvoicesPage) và Viewer (ViewerTuitionPage).
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  paid: "success",
  pending: "info",
  unpaid: "neutral",
  overdue: "danger",
  rejected: "warning",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "Đã thanh toán",
  pending: "Chờ xác nhận",
  unpaid: "Chưa thanh toán",
  overdue: "Quá hạn",
  rejected: "Từ chối",
};
