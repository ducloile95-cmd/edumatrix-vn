import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import { invalidateLessonPlanQueries, invalidateSessionQueries } from "@/hooks/queryInvalidation";

function clientWith(keys: unknown[][]) {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, []));
  return client;
}
const invalidated = (client: QueryClient, key: unknown[]) => client.getQueryState(key)?.isInvalidated;

describe("invalidateSessionQueries", () => {
  test("refreshes every session-derived list, not only ['sessions']", async () => {
    const client = clientWith([["sessions", "range"], ["sessions-by-class", "c1"], ["attendance-sessions"], ["attendance-class-sessions", "c1"], ["sessions-workspace", "t1"], ["courses"]]);
    await invalidateSessionQueries(client);
    expect(invalidated(client, ["sessions", "range"])).toBe(true);
    expect(invalidated(client, ["sessions-by-class", "c1"])).toBe(true);
    expect(invalidated(client, ["attendance-sessions"])).toBe(true);
    expect(invalidated(client, ["attendance-class-sessions", "c1"])).toBe(true);
    expect(invalidated(client, ["sessions-workspace", "t1"])).toBe(true);
    expect(invalidated(client, ["courses"])).toBe(false);
  });
});

describe("invalidateLessonPlanQueries", () => {
  test("refreshes lesson plan lists, gap banner and per-session plan", async () => {
    const client = clientWith([["lesson-plans"], ["lesson-plan-gaps", "c1"], ["lesson-plan", "session", "s1"], ["lesson-plan-templates"]]);
    await invalidateLessonPlanQueries(client);
    expect(invalidated(client, ["lesson-plans"])).toBe(true);
    expect(invalidated(client, ["lesson-plan-gaps", "c1"])).toBe(true);
    expect(invalidated(client, ["lesson-plan", "session", "s1"])).toBe(true);
    expect(invalidated(client, ["lesson-plan-templates"])).toBe(false);
  });
});
