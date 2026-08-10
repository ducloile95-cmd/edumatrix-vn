import { afterEach, describe, expect, test, vi } from "vitest";
import { buildViewerDashboard } from "@/services/firestore/viewerDashboard";

const serviceMocks = vi.hoisted(() => ({
  getStudent: vi.fn(),
  listAccessibleClassesByIds: vi.fn(),
  getCourse: vi.fn(),
  listSessionsByClass: vi.fn(),
  listPublicLessonPlanPreviewByClass: vi.fn(),
  listAssignmentPreviewByClass: vi.fn(),
  listSubmissionPreviewsByStudents: vi.fn(),
  listScoresByStudent: vi.fn(),
  listAttendancePreviewsByStudents: vi.fn(),
  listInvoicePreviewsByStudents: vi.fn(),
  listAnnouncementsByStudents: vi.fn(),
}));

vi.mock("@/services/firestore/students", () => ({ getStudent: serviceMocks.getStudent }));
vi.mock("@/services/firestore/classes", () => ({ listAccessibleClassesByIds: serviceMocks.listAccessibleClassesByIds }));
vi.mock("@/services/firestore/courses", () => ({ getCourse: serviceMocks.getCourse }));
vi.mock("@/services/firestore/sessions", () => ({ listSessionsByClass: serviceMocks.listSessionsByClass }));
vi.mock("@/services/firestore/lessonPlans", () => ({ listPublicLessonPlanPreviewByClass: serviceMocks.listPublicLessonPlanPreviewByClass }));
vi.mock("@/services/firestore/assignments", () => ({
  listAssignmentPreviewByClass: serviceMocks.listAssignmentPreviewByClass,
  listSubmissionPreviewsByStudents: serviceMocks.listSubmissionPreviewsByStudents,
}));
vi.mock("@/services/firestore/scores", () => ({ listScoresByStudent: serviceMocks.listScoresByStudent }));
vi.mock("@/services/firestore/attendance", () => ({ listAttendancePreviewsByStudents: serviceMocks.listAttendancePreviewsByStudents }));
vi.mock("@/services/firestore/invoices", () => ({ listInvoicePreviewsByStudents: serviceMocks.listInvoicePreviewsByStudents }));
vi.mock("@/services/firestore/announcements", () => ({ listAnnouncementsByStudents: serviceMocks.listAnnouncementsByStudents }));

const CLASSES: Record<string, { id: string; courseId: string }> = {
  "class-1": { id: "class-1", courseId: "course-1" },
  "class-2": { id: "class-2", courseId: "course-1" },
  "class-3": { id: "class-3", courseId: "course-2" },
};

function primeMocks() {
  serviceMocks.getStudent.mockImplementation(async (id: string) => ({
    id,
    currentClassIds: ["class-1", "class-2", "class-3", "class-missing"],
  }));
  serviceMocks.listAccessibleClassesByIds.mockResolvedValue(Object.values(CLASSES));
  serviceMocks.getCourse.mockImplementation(async (id: string) => ({ id, name: `Khoa ${id}` }));
  serviceMocks.listSessionsByClass.mockResolvedValue([]);
  serviceMocks.listPublicLessonPlanPreviewByClass.mockResolvedValue([]);
  serviceMocks.listAssignmentPreviewByClass.mockResolvedValue([]);
  serviceMocks.listSubmissionPreviewsByStudents.mockResolvedValue([]);
  serviceMocks.listScoresByStudent.mockResolvedValue([]);
  serviceMocks.listAttendancePreviewsByStudents.mockResolvedValue([]);
  serviceMocks.listInvoicePreviewsByStudents.mockResolvedValue([]);
  serviceMocks.listAnnouncementsByStudents.mockResolvedValue([]);
}

describe("buildViewerDashboard course reads", () => {
  afterEach(() => vi.resetAllMocks());

  test("reads only the distinct courses referenced by the student's classes", async () => {
    primeMocks();

    const dashboard = await buildViewerDashboard(["student-1"]);

    // class-1 va class-2 dung chung course-1 => chi doc 1 lan. Truoc day day la
    // listCourses() doc toan bo collection roi vut gan het o ViewerDashboardPage.
    expect(serviceMocks.getCourse).toHaveBeenCalledTimes(2);
    expect(serviceMocks.getCourse.mock.calls.map(([id]) => id).sort()).toEqual(["course-1", "course-2"]);
    expect(dashboard.courses.map((course) => course.id).sort()).toEqual(["course-1", "course-2"]);
  });

  test("uses only accessible classes for downstream viewer queries", async () => {
    primeMocks();

    await buildViewerDashboard(["student-1"]);

    expect(serviceMocks.listAccessibleClassesByIds).toHaveBeenCalledWith([
      "class-1",
      "class-2",
      "class-3",
      "class-missing",
    ]);
    expect(serviceMocks.getCourse).not.toHaveBeenCalledWith(undefined);
    expect(serviceMocks.listSessionsByClass).not.toHaveBeenCalledWith(
      "class-missing",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  test("still returns student-level data when the student has no accessible class", async () => {
    primeMocks();
    serviceMocks.listAccessibleClassesByIds.mockResolvedValue([]);

    const dashboard = await buildViewerDashboard(["student-1"]);

    expect(dashboard.students).toHaveLength(1);
    expect(dashboard.classes).toEqual([]);
    expect(serviceMocks.listAttendancePreviewsByStudents).toHaveBeenCalledWith(["student-1"], 50);
    expect(serviceMocks.listSessionsByClass).not.toHaveBeenCalled();
  });

  test("keeps bounded preview data for every linked student", async () => {
    primeMocks();
    serviceMocks.listAccessibleClassesByIds.mockResolvedValue([]);
    serviceMocks.listInvoicePreviewsByStudents.mockResolvedValue([
      { id: "invoice-1", studentId: "student-1", status: "unpaid", dueAt: { toMillis: () => 1 } },
      { id: "invoice-2", studentId: "student-2", status: "unpaid", dueAt: { toMillis: () => 2 } },
    ]);
    serviceMocks.listAttendancePreviewsByStudents.mockResolvedValue([
      { id: "attendance-1", studentId: "student-1" },
      { id: "attendance-2", studentId: "student-2" },
    ]);

    const dashboard = await buildViewerDashboard(["student-1", "student-2"]);

    expect(serviceMocks.listInvoicePreviewsByStudents).toHaveBeenCalledWith(["student-1", "student-2"], 30);
    expect(dashboard.unpaidInvoices.map((item) => item.studentId)).toEqual(["student-1", "student-2"]);
    expect(dashboard.attendance.map((item) => item.studentId)).toEqual(["student-1", "student-2"]);
  });
});
