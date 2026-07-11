import { describe, expect, test } from "vitest";
import { paginate } from "@/hooks/usePagination";

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);

  test("returns the requested full page", () => {
    expect(paginate(items, 2, 10)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  test("returns the remaining items on the last page", () => {
    expect(paginate(items, 3, 10)).toEqual([21, 22, 23]);
  });

  test("returns an empty list beyond the last page", () => {
    expect(paginate(items, 4, 10)).toEqual([]);
  });
});
