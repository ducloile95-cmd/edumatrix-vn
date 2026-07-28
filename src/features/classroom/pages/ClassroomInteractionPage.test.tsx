// @vitest-environment jsdom

import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ClassroomInteractionPage from "@/features/classroom/pages/ClassroomInteractionPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const serviceMocks = vi.hoisted(() => ({
  getClass: vi.fn(),
  getCourse: vi.fn(),
  getLessonPlanBySession: vi.fn(),
  getSession: vi.fn(),
  getSessionAttendanceEntries: vi.fn(),
  getSessionInteraction: vi.fn(),
  getSessionStudentReviews: vi.fn(),
  listSessionsByClass: vi.fn(),
  listStudents: vi.fn(),
  publishClassroomInteraction: vi.fn(),
  reopenClassroomInteraction: vi.fn(),
  saveClassroomDraft: vi.fn(),
  sendMessenger: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ firebaseUser: { uid: "teacher-1" } }),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/services/firestore/classes", () => ({
  getClass: serviceMocks.getClass,
  listClasses: vi.fn(),
}));

vi.mock("@/services/firestore/courses", () => ({
  getCourse: serviceMocks.getCourse,
  listCourses: vi.fn(),
}));

vi.mock("@/services/firestore/sessions", () => ({
  getSession: serviceMocks.getSession,
  listSessions: vi.fn(),
  listSessionsByClass: serviceMocks.listSessionsByClass,
}));

vi.mock("@/services/firestore/lessonPlans", () => ({
  getLessonPlanBySession: serviceMocks.getLessonPlanBySession,
}));

vi.mock("@/services/firestore/students", () => ({
  listStudents: serviceMocks.listStudents,
}));

vi.mock("@/services/firestore/users", () => ({
  listUsersByRole: vi.fn(),
}));

vi.mock("@/services/integrations/messenger", () => ({
  sendMessenger: serviceMocks.sendMessenger,
}));

vi.mock("@/services/firestore/classroomInteractions", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/services/firestore/classroomInteractions")
  >();
  return {
    ...actual,
    getSessionAttendanceEntries: serviceMocks.getSessionAttendanceEntries,
    getSessionInteraction: serviceMocks.getSessionInteraction,
    getSessionStudentReviews: serviceMocks.getSessionStudentReviews,
    publishClassroomInteraction: serviceMocks.publishClassroomInteraction,
    reopenClassroomInteraction: serviceMocks.reopenClassroomInteraction,
    saveClassroomDraft: serviceMocks.saveClassroomDraft,
  };
});

function timestamp(value: string) {
  const date = new Date(value);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

const session = {
  id: "session-1",
  classId: "class-1",
  title: "Buổi 1",
  status: "scheduled",
  location: "Phòng 1",
  startAt: timestamp("2026-07-28T08:00:00.000Z"),
  endAt: timestamp("2026-07-28T09:30:00.000Z"),
};

function renderPage() {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={["/app/classroom/session-1"]}>
      <Routes>
        <Route
          path="/app/classroom/:sessionId"
          element={<ClassroomInteractionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function openPublishConfirmation() {
  fireEvent.click(
    await screen.findByRole("tab", { name: "Gửi thông báo" }),
  );
  const publishButton = await screen.findByRole("button", {
    name: "Hoàn tất và phát hành",
  });
  await waitFor(() => {
    expect(publishButton).toHaveProperty("disabled", false);
  });
  fireEvent.click(publishButton);
  return screen.findByRole("button", { name: "Phát hành" });
}

describe("ClassroomInteractionPage publishing", () => {
  beforeEach(() => {
    serviceMocks.getSession.mockResolvedValue(session);
    serviceMocks.getClass.mockResolvedValue({
      id: "class-1",
      name: "Lớp A1",
      courseId: "course-1",
      studentIds: ["student-1"],
      teacherIds: ["teacher-1"],
      status: "active",
    });
    serviceMocks.listStudents.mockResolvedValue([
      {
        id: "student-1",
        fullName: "Nguyễn An",
        parentUids: ["parent-1"],
      },
    ]);
    serviceMocks.getCourse.mockResolvedValue({
      id: "course-1",
      totalSessions: 10,
      startDate: timestamp("2026-07-01T00:00:00.000Z"),
      endDate: timestamp("2026-12-01T00:00:00.000Z"),
    });
    serviceMocks.listSessionsByClass.mockResolvedValue([]);
    serviceMocks.getLessonPlanBySession.mockResolvedValue(null);
    serviceMocks.getSessionInteraction.mockResolvedValue({
      taughtContent: "Nội dung bài học",
      quickSummary: "Học sinh tiếp thu tốt",
      homeworkText: "Bài tập trang 10",
      workflowStatus: "draft",
    });
    serviceMocks.getSessionStudentReviews.mockResolvedValue([
      {
        studentId: "student-1",
        attendanceStatus: "present",
        previousHomeworkStatus: "done",
        individualComment: "",
      },
    ]);
    serviceMocks.getSessionAttendanceEntries.mockResolvedValue([]);
    serviceMocks.saveClassroomDraft.mockResolvedValue(undefined);
    serviceMocks.publishClassroomInteraction.mockResolvedValue([
      {
        studentId: "student-1",
        studentName: "Nguyễn An",
        messenger: "sent",
        message: "Tổng kết",
        detail: "",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("saves the latest draft and publishes the session summary", async () => {
    renderPage();
    fireEvent.click(await openPublishConfirmation());

    await waitFor(() => {
      expect(serviceMocks.saveClassroomDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "session-1",
          classId: "class-1",
          teacherId: "teacher-1",
        }),
      );
      expect(serviceMocks.publishClassroomInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "session-1",
          classId: "class-1",
          students: [{ id: "student-1", fullName: "Nguyễn An" }],
        }),
      );
    });
  });

  test("reports a publish failure without hiding the publishing controls", async () => {
    serviceMocks.publishClassroomInteraction.mockRejectedValueOnce(
      new Error("offline"),
    );
    renderPage();
    fireEvent.click(await openPublishConfirmation());

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Không phát hành được",
      );
    });
    expect(
      screen.getByRole("button", { name: "Hoàn tất và phát hành" }),
    ).toBeTruthy();
  });

  test("does not expose publishing when the session is inaccessible", async () => {
    serviceMocks.getSession.mockResolvedValueOnce(null);
    renderPage();

    await screen.findByText(/không có quyền truy cập/i);
    expect(
      screen.queryByRole("button", { name: "Gửi thông báo" }),
    ).toBeNull();
    expect(serviceMocks.publishClassroomInteraction).not.toHaveBeenCalled();
  });
});
