import { describe, expect, test } from "vitest";
import { sessionFormSchema } from "@/schemas/session";

const base = {
  classId: "class-1",
  title: "Buổi học",
  location: "Phòng 201",
  note: "",
  makeUpForSessionId: "",
  startAt: "",
  endAt: "",
  recurrenceStartDate: "",
  recurrenceDays: [] as number[],
  recurrenceStartTime: "",
  recurrenceEndTime: "",
  sessionCount: 1,
};

describe("sessionFormSchema", () => {
  test("accepts a valid single session", () => {
    const result = sessionFormSchema.safeParse({
      ...base,
      scheduleMode: "single",
      startAt: "2026-07-21T19:45",
      endAt: "2026-07-21T21:00",
    });

    expect(result.success).toBe(true);
  });

  test("accepts a Tuesday and Wednesday weekly schedule", () => {
    const result = sessionFormSchema.safeParse({
      ...base,
      scheduleMode: "weekly",
      recurrenceStartDate: "2026-07-20",
      recurrenceDays: [2, 3],
      recurrenceStartTime: "19:45",
      recurrenceEndTime: "21:00",
      sessionCount: 24,
    });

    expect(result.success).toBe(true);
  });

  test("rejects a weekly schedule without weekdays", () => {
    const result = sessionFormSchema.safeParse({
      ...base,
      scheduleMode: "weekly",
      recurrenceStartDate: "2026-07-20",
      recurrenceStartTime: "19:45",
      recurrenceEndTime: "21:00",
    });

    expect(result.success).toBe(false);
  });

  test("rejects an end time that is not after the start time", () => {
    const result = sessionFormSchema.safeParse({
      ...base,
      scheduleMode: "weekly",
      recurrenceStartDate: "2026-07-20",
      recurrenceDays: [2, 3],
      recurrenceStartTime: "21:00",
      recurrenceEndTime: "19:45",
    });

    expect(result.success).toBe(false);
  });
});
