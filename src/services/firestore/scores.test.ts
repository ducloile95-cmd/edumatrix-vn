import { beforeEach, describe, expect, test, vi } from "vitest";

const { runTransaction, transactionGet, transactionSet } = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, collectionName: string, id: string) => `${collectionName}/${id}`),
  documentId: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction,
  serverTimestamp: vi.fn(() => "server-time"),
  where: vi.fn(),
}));

vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));

import { saveClassScores } from "@/services/firestore/scores";

const baseInput = {
  classId: "class-1",
  subjectId: "math",
  assessmentName: "Quiz 1",
  assessmentType: "quiz" as const,
  maxScore: 10,
  actorUid: "teacher-1",
};

describe("saveClassScores", () => {
  beforeEach(() => {
    runTransaction.mockReset();
    transactionGet.mockReset();
    transactionSet.mockReset();
    runTransaction.mockImplementation(async (_db, callback) => callback({
      get: transactionGet,
      set: transactionSet,
    }));
  });

  test("validates every score before opening a transaction", async () => {
    await expect(saveClassScores({
      ...baseInput,
      entries: [
        { studentId: "student-1", score: 8, comment: "" },
        { studentId: "student-2", score: 11, comment: "" },
      ],
    })).rejects.toThrow("SCORE_INVALID");

    expect(runTransaction).not.toHaveBeenCalled();
  });

  test("writes the whole class in one transaction", async () => {
    transactionGet.mockResolvedValue({ exists: () => false });

    await saveClassScores({
      ...baseInput,
      entries: [
        { studentId: "student-1", score: 8, comment: "Tốt" },
        { studentId: "student-2", score: 9, comment: "Tiến bộ" },
      ],
    });

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transactionGet).toHaveBeenCalledTimes(4);
    expect(transactionSet).toHaveBeenCalledTimes(4);
  });

  test("rejects duplicate students and oversized class writes", async () => {
    await expect(saveClassScores({
      ...baseInput,
      entries: [
        { studentId: "student-1", score: 8, comment: "" },
        { studentId: "student-1", score: 9, comment: "" },
      ],
    })).rejects.toThrow("STUDENT_DUPLICATED");

    await expect(saveClassScores({
      ...baseInput,
      entries: Array.from({ length: 201 }, (_, index) => ({
        studentId: `student-${index}`,
        score: 8,
        comment: "",
      })),
    })).rejects.toThrow("SCORE_BATCH_TOO_LARGE");
  });
});
