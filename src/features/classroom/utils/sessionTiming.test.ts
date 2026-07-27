import { describe, expect, test } from "vitest";
import { isActionableTodaySession } from "@/features/classroom/utils/sessionTiming";

const now = new Date(2026, 6, 25, 18, 30);

describe("isActionableTodaySession", () => {
  test("keeps current and upcoming sessions from today only", () => {
    expect(isActionableTodaySession({
      startAt: new Date(2026, 6, 25, 18, 0),
      endAt: new Date(2026, 6, 25, 19, 30),
      status: "scheduled",
    }, now)).toBe(true);
    expect(isActionableTodaySession({
      startAt: new Date(2026, 6, 25, 19, 45),
      endAt: new Date(2026, 6, 25, 21, 15),
      status: "rescheduled",
    }, now)).toBe(true);
  });

  test.each([
    ["ended", new Date(2026, 6, 25, 16, 0), new Date(2026, 6, 25, 17, 30), "scheduled"],
    ["tomorrow", new Date(2026, 6, 26, 18, 0), new Date(2026, 6, 26, 19, 30), "scheduled"],
    ["cancelled", new Date(2026, 6, 25, 19, 0), new Date(2026, 6, 25, 20, 30), "cancelled"],
    ["completed", new Date(2026, 6, 25, 19, 0), new Date(2026, 6, 25, 20, 30), "completed"],
  ] as const)("hides %s sessions", (_, startAt, endAt, status) => {
    expect(isActionableTodaySession({ startAt, endAt, status }, now)).toBe(false);
  });
});
