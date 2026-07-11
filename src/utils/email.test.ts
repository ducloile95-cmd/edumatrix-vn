import { describe, expect, test } from "vitest";
import { isValidEmail, normalizeEmail } from "@/utils/email";

describe("normalizeEmail", () => {
  test("trims whitespace and lowercases the address", () => {
    expect(normalizeEmail("  Parent.Name@Example.COM ")).toBe("parent.name@example.com");
  });
});

describe("isValidEmail", () => {
  test.each(["parent@example.com", "teacher.name+tag@school.edu.vn"])(
    "accepts valid address %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  test.each(["", "missing-at.example.com", "name@domain", "name @example.com"])(
    "rejects invalid address %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});
