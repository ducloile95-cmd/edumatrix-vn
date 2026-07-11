import { describe, expect, test } from "vitest";
import { chunk, stableDocumentId } from "./idempotency";

describe("idempotency helpers", () => {
  test("creates a deterministic Firestore-safe document id", () => {
    expect(stableDocumentId(["class/1", "subject 1", "Quiz", "student 1"])).toBe("class-1_subject-1_Quiz_student-1");
    expect(stableDocumentId(["same", "value"])).toBe(stableDocumentId(["same", "value"]));
  });

  test("chunks writes without losing order or items", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 200)).toEqual([]);
  });

  test("rejects an invalid batch size", () => {
    expect(() => chunk([1], 0)).toThrow("CHUNK_SIZE_INVALID");
  });
});
