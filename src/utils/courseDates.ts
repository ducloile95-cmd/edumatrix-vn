import { addDays, format, isValid, parseISO } from "date-fns";

/** Tinh theo quy uoc mot buoi moi ngay, tinh ca ngay bat dau. */
export function calculateCourseEndDate(startDate: string, totalSessions: number): string {
  const parsedStart = parseISO(startDate);
  const normalizedTotalSessions = Number(totalSessions);
  if (!startDate || !isValid(parsedStart) || !Number.isInteger(normalizedTotalSessions) || normalizedTotalSessions < 1) return "";
  return format(addDays(parsedStart, normalizedTotalSessions - 1), "yyyy-MM-dd");
}
