import { describe, expect, test } from "vitest";
import { generateRecurringSessions } from "@/utils/recurrence";

describe("generateRecurringSessions", () => {
  test("computes session times as Vietnam wall-clock, independent of the machine's system timezone", () => {
    const result = generateRecurringSessions({
      startDate: new Date("2026-07-20T00:00:00"),
      daysOfWeek: [1, 3, 5], // T2, T4, T6
      startTime: "14:00",
      endTime: "15:30",
      sessionCount: 3,
    });

    // 14:00/15:30 gio Viet Nam (UTC+7, khong doi mua) = 07:00/08:30 UTC,
    // bat ke process.env.TZ cua may chay test la gi.
    expect(result.sessions.map((s) => s.startAt.toISOString())).toEqual([
      "2026-07-20T07:00:00.000Z",
      "2026-07-22T07:00:00.000Z",
      "2026-07-24T07:00:00.000Z",
    ]);
    expect(result.sessions.map((s) => s.endAt.toISOString())).toEqual([
      "2026-07-20T08:30:00.000Z",
      "2026-07-22T08:30:00.000Z",
      "2026-07-24T08:30:00.000Z",
    ]);
  });

  test("first session always falls on startDate regardless of daysOfWeek", () => {
    const result = generateRecurringSessions({
      startDate: new Date("2026-07-21T00:00:00"), // Thu 3 (Tuesday)
      daysOfWeek: [1], // chi thu 2, khong khop startDate
      startTime: "08:00",
      endTime: "09:00",
      sessionCount: 2,
    });

    expect(result.sessions[0].startAt.toISOString()).toBe("2026-07-21T01:00:00.000Z");
    // buoi tiep theo phai la thu 2 gan nhat sau startDate
    expect(result.sessions[1].startAt.toISOString()).toBe("2026-07-27T01:00:00.000Z");
  });
});
