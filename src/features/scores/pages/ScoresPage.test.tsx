// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScoresPage from "@/features/scores/pages/ScoresPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  getClass: vi.fn(),
  listClasses: vi.fn(),
  listStudents: vi.fn(),
  listSubjects: vi.fn(),
  listScoresByClass: vi.fn(),
  saveClassScores: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ firebaseUser: { uid: "teacher-1" }, role: "teacher" }),
}));
vi.mock("@/services/firestore/classes", () => ({ getClass: serviceMocks.getClass, listClasses: serviceMocks.listClasses }));
vi.mock("@/services/firestore/students", () => ({ listStudents: serviceMocks.listStudents }));
vi.mock("@/services/firestore/subjects", () => ({ listSubjects: serviceMocks.listSubjects }));
vi.mock("@/services/firestore/auditLog", () => ({ writeAuditLog: serviceMocks.writeAuditLog }));
vi.mock("@/services/firestore/scores", () => ({ listScoresByClass: serviceMocks.listScoresByClass, saveClassScores: serviceMocks.saveClassScores }));

beforeEach(() => {
  serviceMocks.listClasses.mockResolvedValue([{ id: "class-1", name: "Lớp 10A", studentIds: ["student-1"], subjectIds: ["math"] }]);
  serviceMocks.getClass.mockResolvedValue({ id: "class-1", name: "Lớp 10A", studentIds: ["student-1"], subjectIds: ["math"] });
  serviceMocks.listStudents.mockResolvedValue([{ id: "student-1", fullName: "Nguyễn An", studentCode: "HS001" }]);
  serviceMocks.listSubjects.mockResolvedValue([{ id: "math", name: "Toán" }]);
  serviceMocks.listScoresByClass.mockResolvedValue([{ id: "score-1", studentId: "student-1", classId: "class-1", subjectId: "math", assessmentName: "Quiz 1", assessmentType: "quiz", score: 8, maxScore: 10, teacherComment: "Tốt", published: true }]);
  serviceMocks.saveClassScores.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ScoresPage", () => {
  test("hydrates persisted scores and never turns a cleared score into zero", async () => {
    renderWithQueryClient(<ScoresPage embedded />);

    await screen.findByRole("option", { name: "Lớp 10A" });
    fireEvent.change(screen.getByLabelText("Lớp học"), { target: { value: "class-1" } });
    await screen.findAllByText("Nguyễn An");
    fireEvent.change(screen.getByLabelText("Tên đầu điểm"), { target: { value: "Quiz 1" } });

    const scoreInputs = await screen.findAllByLabelText("Điểm Nguyễn An");
    await waitFor(() => expect((scoreInputs[0] as HTMLInputElement).value).toBe("8"));
    fireEvent.change(scoreInputs[0], { target: { value: "" } });

    expect((screen.getByRole("button", { name: /Lưu điểm/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(serviceMocks.saveClassScores).not.toHaveBeenCalled();

    fireEvent.change(scoreInputs[0], { target: { value: "8.5" } });
    fireEvent.click(screen.getByRole("button", { name: /Lưu điểm/ }));

    await waitFor(() => expect(serviceMocks.saveClassScores).toHaveBeenCalledWith(expect.objectContaining({
      entries: [{ studentId: "student-1", score: 8.5, comment: "Tốt" }],
    })));
  });
});
