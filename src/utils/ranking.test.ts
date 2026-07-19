import { describe, expect, test } from "vitest";
import { DEFAULT_RANK_THRESHOLDS, isValidRankThresholds, rankFromPercent } from "./ranking";

describe("academic ranking", () => {
  test.each([
    [100, "S"], [90, "S"], [89.99, "A"], [80, "A"],
    [79.99, "B"], [65, "B"], [64.99, "D"], [0, "D"], [null, null],
  ])("maps %s to %s", (percent, rank) => {
    expect(rankFromPercent(percent, DEFAULT_RANK_THRESHOLDS)).toBe(rank);
  });

  test("rejects unordered thresholds", () => {
    expect(isValidRankThresholds(DEFAULT_RANK_THRESHOLDS)).toBe(true);
    expect(isValidRankThresholds({ S: 80, A: 90, B: 65, D: 0 })).toBe(false);
    expect(isValidRankThresholds({ S: 90, A: 80, B: 65, D: 1 })).toBe(false);
  });
});
