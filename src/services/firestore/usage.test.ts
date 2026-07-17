import { describe, expect, test } from "vitest";
import { summarizeUsage } from "@/services/firestore/usage";

describe("summarizeUsage", () => {
  test("aggregates counters and sorts collections", () => {
    const summary = summarizeUsage([
      { collectionId: "users", reads: 12, writes: 2, deletes: 0, lastLatencyMs: 120 },
      { collectionId: "classes", reads: 5, writes: 1, deletes: 0, lastLatencyMs: 80 },
      { collectionId: "users", reads: 4, writes: 0, deletes: 1, lastLatencyMs: 100 },
    ]);
    expect(summary).toMatchObject({ reads: 21, writes: 3, deletes: 1, latencyMs: 100 });
    expect(summary.byCollection[0]).toEqual({ collectionId: "users", operations: 19 });
  });

  test("returns zero latency for empty input", () => {
    expect(summarizeUsage([])).toMatchObject({ reads: 0, writes: 0, deletes: 0, latencyMs: 0, byCollection: [] });
  });
});
