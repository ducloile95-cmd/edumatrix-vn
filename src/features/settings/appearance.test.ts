import { describe, expect, test } from "vitest";
import { parseStoredTheme, resolveTheme } from "@/features/settings/appearance";

describe("appearance theme", () => {
  test("reads the current and legacy preference shapes safely", () => {
    expect(parseStoredTheme('{"theme":"dark"}')).toBe("dark");
    expect(parseStoredTheme('{"theme":"light","language":"en"}')).toBe("light");
    expect(parseStoredTheme('{"theme":"invalid"}')).toBe("system");
    expect(parseStoredTheme("not-json")).toBe("system");
    expect(parseStoredTheme(null)).toBe("system");
  });

  test("resolves system preference without overriding explicit choices", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
