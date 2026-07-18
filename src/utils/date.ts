import { format } from "date-fns";
import type { Timestamp } from "firebase/firestore";

type DateLike = Date | Timestamp;

function toDate(value: DateLike): Date {
  return value instanceof Date ? value : value.toDate();
}

/** Ngay kieu Viet Nam: 18/07/2026. Nhan Date hoac Firestore Timestamp. */
export function formatDateVn(value: DateLike): string {
  return format(toDate(value), "dd/MM/yyyy");
}

/** Ngay gio kieu Viet Nam: 18/07/2026 14:30. Nhan Date hoac Firestore Timestamp. */
export function formatDateTimeVn(value: DateLike): string {
  return format(toDate(value), "dd/MM/yyyy HH:mm");
}
