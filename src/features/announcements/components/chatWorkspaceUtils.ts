import { format } from "date-fns";
import type { ChatThreadDoc } from "@/types/chat";

export type ChatThread = ChatThreadDoc & { id: string };

export function initials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export function accountName(thread: ChatThread) {
  return thread.facebookName?.trim() || thread.parentName;
}

export function time(value: { toDate?: () => Date } | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value.toDate?.();
  return date && !Number.isNaN(date.getTime()) ? format(date, "dd/MM HH:mm") : "";
}
