import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserDoc: vi.fn(), getDocs: vi.fn(), runTransaction: vi.fn(),
  transactionDelete: vi.fn(), transactionGet: vi.fn(), transactionSet: vi.fn(), transactionUpdate: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  arrayRemove: vi.fn((value) => ({ remove: value })),
  arrayUnion: vi.fn((value) => ({ union: value })),
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, name: string, id: string) => ({ id, path: `${name}/${id}` })),
  getDoc: vi.fn(), getDocs: mocks.getDocs, limit: vi.fn(), orderBy: vi.fn(), query: vi.fn(),
  runTransaction: mocks.runTransaction, serverTimestamp: vi.fn(() => "server-time"), startAfter: vi.fn(),
  updateDoc: vi.fn(), where: vi.fn(), writeBatch: vi.fn(),
}));
vi.mock("@/services/firebase/firestoreClient", () => ({ db: {} }));
vi.mock("@/services/firestore/authz", () => ({ getCurrentUserDoc: mocks.getCurrentUserDoc }));

import { createStudentWithRelations, deleteStudent, listStudents, setStudentStatus } from "./students";

function snapshot(id: string, data: Record<string, unknown> | null) {
  return { id, exists: () => data !== null, data: () => data };
}

describe("createStudentWithRelations", () => {
  beforeEach(() => {
    mocks.getCurrentUserDoc.mockReset().mockResolvedValue({ uid: "admin-1", role: "admin" });
    mocks.getDocs.mockReset().mockResolvedValue({ empty: false, docs: [{ ref: { id: "parent-1", path: "users/parent-1" } }] });
    mocks.transactionGet.mockReset(); mocks.transactionSet.mockReset(); mocks.transactionUpdate.mockReset();
    mocks.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      get: mocks.transactionGet, set: mocks.transactionSet, update: mocks.transactionUpdate,
    }));
  });

  test("does not write anything when parent or class is invalid", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("HS001", null))
      .mockResolvedValueOnce(snapshot("class-1", { courseId: "course-1", teacherIds: [], status: "cancelled" }))
      .mockResolvedValueOnce(snapshot("parent-1", { email: "parent@example.com", role: "viewer", status: "active" }));
    await expect(createStudentWithRelations({ studentCode: "hs001", fullName: "Student", dateOfBirth: "2015-01-01", classId: "class-1", parentEmail: "PARENT@example.com" }))
      .rejects.toThrow("CLASS_NOT_ACTIVE");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });

  test("writes student, enrollment, class and parent in one transaction", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("HS001", null))
      .mockResolvedValueOnce(snapshot("class-1", { courseId: "course-1", teacherIds: ["teacher-1"], status: "active" }))
      .mockResolvedValueOnce(snapshot("parent-1", { email: "parent@example.com", role: "viewer", status: "active" }));
    await createStudentWithRelations({ studentCode: "hs001", fullName: "Student", dateOfBirth: "2015-01-01", classId: "class-1", parentEmail: "PARENT@example.com", staffNote: "note" });
    expect(mocks.transactionSet).toHaveBeenCalledTimes(3);
    expect(mocks.transactionUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.transactionSet).toHaveBeenCalledWith(expect.objectContaining({ path: "students/HS001" }), expect.objectContaining({
      parentUids: ["parent-1"], currentClassIds: ["class-1"], teacherIds: ["teacher-1"], staffNote: "note",
    }));
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("messenger_delivery_events/enrollment_completed:class-1_HS001:v1") }),
      expect.objectContaining({ eventType: "enrollment_completed", entityId: "class-1_HS001", studentId: "HS001" }),
    );
  });

  test("requires a teacher to choose an assigned active class", async () => {
    mocks.getCurrentUserDoc.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
    mocks.transactionGet.mockResolvedValueOnce(snapshot("HS002", null));

    await expect(createStudentWithRelations({ studentCode: "HS002", fullName: "Student", dateOfBirth: "2015-01-01" }))
      .rejects.toThrow("TEACHER_CLASS_REQUIRED");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  test("rejects a class not assigned to the teacher", async () => {
    mocks.getCurrentUserDoc.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("HS002", null))
      .mockResolvedValueOnce(snapshot("class-2", { courseId: "course-1", teacherIds: ["teacher-2"], status: "active" }));

    await expect(createStudentWithRelations({ studentCode: "HS002", fullName: "Student", dateOfBirth: "2015-01-01", classId: "class-2" }))
      .rejects.toThrow("TEACHER_CLASS_FORBIDDEN");
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  test("does not deactivate a student who is still enrolled", async () => {
    mocks.transactionGet.mockResolvedValueOnce(snapshot("HS001", {
      status: "active", currentClassIds: ["class-1"], teacherIds: ["teacher-1"],
    }));

    await expect(setStudentStatus("HS001", "inactive")).rejects.toThrow("STUDENT_HAS_ACTIVE_CLASSES");
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });
});

describe("listStudents pagination", () => {
  test("loads every page instead of truncating after 200 students", async () => {
    const student = (id: string) => ({
      id,
      data: () => ({
        studentCode: id, fullName: id, dateOfBirth: "2015-01-01", parentUids: [],
        currentClassIds: [], teacherIds: [], status: "active", createdAt: "time", updatedAt: "time",
      }),
    });
    mocks.getCurrentUserDoc.mockResolvedValue({ uid: "admin-1", role: "admin" });
    mocks.getDocs
      .mockResolvedValueOnce({ docs: Array.from({ length: 200 }, (_, index) => student(`S${index}`)), size: 200 })
      .mockResolvedValueOnce({ docs: [student("S200")], size: 1 });

    await expect(listStudents()).resolves.toHaveLength(201);
    expect(mocks.getDocs).toHaveBeenCalledTimes(2);
  });
});

describe("deleteStudent", () => {
  beforeEach(() => {
    mocks.transactionDelete.mockReset(); mocks.transactionGet.mockReset(); mocks.transactionUpdate.mockReset();
    mocks.runTransaction.mockReset().mockImplementation(async (_db, callback) => callback({
      delete: mocks.transactionDelete, get: mocks.transactionGet, update: mocks.transactionUpdate,
    }));
  });

  test("hard deletes the student and removes active reverse links", async () => {
    mocks.transactionGet
      .mockResolvedValueOnce(snapshot("HS001", { parentUids: ["parent-1"], currentClassIds: ["class-1"] }))
      .mockResolvedValueOnce(snapshot("parent-1", { studentIds: ["HS001"] }))
      .mockResolvedValueOnce(snapshot("class-1", { studentIds: ["HS001"] }))
      .mockResolvedValueOnce(snapshot("class-1_HS001", { status: "active" }));

    await deleteStudent("HS001");

    expect(mocks.transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/parent-1" }),
      expect.objectContaining({ studentIds: { remove: "HS001" } }),
    );
    expect(mocks.transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "classes/class-1" }),
      expect.objectContaining({ studentIds: { remove: "HS001" } }),
    );
    expect(mocks.transactionDelete).toHaveBeenCalledWith(expect.objectContaining({ path: "enrollments/class-1_HS001" }));
    expect(mocks.transactionDelete).toHaveBeenCalledWith(expect.objectContaining({ path: "students/HS001" }));
  });
});
