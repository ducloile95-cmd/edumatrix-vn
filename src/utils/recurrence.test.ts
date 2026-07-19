import { describe, expect, test } from "vitest";
import { generateRecurringSessions, schoolDateTimeToDate } from "@/utils/recurrence";

describe("generateRecurringSessions", () => {
  test("parses datetime-local values as Vietnam time", () => {
    expect(schoolDateTimeToDate("2026-07-21T19:45").toISOString()).toBe("2026-07-21T12:45:00.000Z");
  });

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

  test("starts on the first selected weekday on or after startDate", () => {
    const result = generateRecurringSessions({
      startDate: new Date("2026-07-21T00:00:00"), // Thu 3 (Tuesday)
      daysOfWeek: [1], // chi thu 2, khong khop startDate
      startTime: "08:00",
      endTime: "09:00",
      sessionCount: 2,
    });

    expect(result.sessions[0].startAt.toISOString()).toBe("2026-07-27T01:00:00.000Z");
    expect(result.sessions[1].startAt.toISOString()).toBe("2026-08-03T01:00:00.000Z");
  });

  test("creates a Tuesday and Wednesday schedule at 19:45 Vietnam time", () => {
    const result = generateRecurringSessions({
      startDate: new Date("2026-07-20T00:00:00"),
      daysOfWeek: [2, 3],
      startTime: "19:45",
      endTime: "21:00",
      sessionCount: 4,
    });

    expect(result.sessions.map((session) => session.startAt.toISOString())).toEqual([
      "2026-07-21T12:45:00.000Z",
      "2026-07-22T12:45:00.000Z",
      "2026-07-28T12:45:00.000Z",
      "2026-07-29T12:45:00.000Z",
    ]);
    expect(result.sessions.map((session) => session.endAt.toISOString())).toEqual([
      "2026-07-21T14:00:00.000Z",
      "2026-07-22T14:00:00.000Z",
      "2026-07-28T14:00:00.000Z",
      "2026-07-29T14:00:00.000Z",
    ]);
  });
});
