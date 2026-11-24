import { formatInTimeZone } from "date-fns-tz";
import type { InvoiceDoc, InvoiceStatus } from "@/types/academic";

const VN_TZ = "Asia/Ho_Chi_Minh";

/** "Quá hạn" không được ghi xuống Firestore (không có scheduler trên Spark): tính khi hiển thị, hết ngày hạn theo giờ Việt Nam. */
export function effectiveInvoiceStatus(invoice: Pick<InvoiceDoc, "status" | "dueAt">, now = new Date()): InvoiceStatus {
  if (invoice.status !== "unpaid") return invoice.status;
  const today = formatInTimeZone(now, VN_TZ, "yyyy-MM-dd");
  const dueDay = formatInTimeZone(invoice.dueAt.toDate(), VN_TZ, "yyyy-MM-dd");
  return dueDay < today ? "overdue" : "unpaid";
}
