import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp, updateDoc } from "firebase/firestore";

const PROJECT_ID = "immutable-rules";
let env: RulesTestEnvironment;

const admin = "admin";
const teacher = "teacher";
const viewer = "viewer";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", admin), { role: "admin", status: "active", studentIds: [] });
    await setDoc(doc(db, "users", teacher), { role: "teacher", status: "active", studentIds: [] });
    await setDoc(doc(db, "users", viewer), { role: "viewer", status: "active", studentIds: ["student-1"] });
    await setDoc(doc(db, "classes", "class-1"), {
      courseId: "course-1",
      subjectIds: ["subject-1"],
      teacherIds: [teacher],
      studentIds: ["student-1"],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "classes", "class-2"), {
      courseId: "course-1",
      subjectIds: ["subject-1"],
      teacherIds: [],
      studentIds: [],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "students", "student-1"), {
      studentCode: "student-1",
      fullName: "Student One",
      dateOfBirth: "2014-01-01",
      parentUids: [viewer],
      currentClassIds: ["class-1"],
      teacherIds: [teacher],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "enrollments", "class-1_student-1"), {
      classId: "class-1",
      courseId: "course-1",
      studentId: "student-1",
      status: "active",
      joinedAt: Timestamp.now(),
      endedAt: null,
    });
    await setDoc(doc(db, "sessions", "session-1"), {
      classId: "class-1",
      title: "Session",
      startAt: Timestamp.now(),
      endAt: Timestamp.now(),
      location: "Room",
      status: "scheduled",
      note: "",
      makeUpForSessionId: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "attendance", "session-1_student-1"), {
      sessionId: "session-1",
      classId: "class-1",
      studentId: "student-1",
      status: "present",
      note: "",
      markedBy: teacher,
      markedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "lesson_plans", "plan-1"), {
      title: "Plan",
      classId: "class-1",
      courseId: "course-1",
      subjectId: "subject-1",
      sessionId: "session-1",
      sections: [],
      publicSummary: "",
      status: "draft",
      createdBy: teacher,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "assignments", "assignment-1"), {
      title: "Assignment",
      description: "",
      classId: "class-1",
      lessonPlanId: null,
      sessionId: null,
      dueAt: Timestamp.now(),
      submissionType: "text",
      maxScore: 10,
      status: "published",
      createdBy: teacher,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "submissions", "assignment-1_student-1"), {
      assignmentId: "assignment-1",
      studentId: "student-1",
      classId: "class-1",
      submissionUrl: "",
      submissionText: "done",
      studentNote: "",
      status: "submitted",
      score: null,
      teacherComment: "",
      checkedBy: null,
      submittedAt: Timestamp.now(),
      checkedAt: null,
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "scores", "score-1"), {
      studentId: "student-1",
      classId: "class-1",
      subjectId: "subject-1",
      assessmentName: "Quiz",
      assessmentType: "quiz",
      score: 8,
      maxScore: 10,
      teacherComment: "",
      createdBy: teacher,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "invoices", "invoice-1"), {
      invoiceCode: "INV-1",
      studentId: "student-1",
      courseId: "course-1",
      title: "Tuition",
      amount: 1000000,
      dueAt: Timestamp.now(),
      paymentContent: "INV-1",
      bankBin: "970000",
      accountNumber: "123",
      accountName: "EduMatrix",
      status: "unpaid",
      createdBy: admin,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "payments", "payment-1"), {
      invoiceId: "invoice-1",
      studentId: "student-1",
      amount: 1000000,
      transactionReference: "TXN",
      note: "",
      status: "reported",
      reportedBy: viewer,
      verifiedBy: null,
      reportedAt: Timestamp.now(),
      verifiedAt: null,
      updatedAt: Timestamp.now(),
    });
  });
});

function asAdmin() {
  return env.authenticatedContext(admin).firestore();
}

function asTeacher() {
  return env.authenticatedContext(teacher).firestore();
}

describe("immutable Firestore fields", () => {
  test("admin cannot rewrite enrollment identity fields", async () => {
    await assertFails(updateDoc(doc(asAdmin(), "enrollments", "class-1_student-1"), { studentId: "student-2" }));
  });

  test("teacher cannot move class-scoped records to another class", async () => {
    await assertFails(updateDoc(doc(asTeacher(), "sessions", "session-1"), { classId: "class-2" }));
    await assertFails(updateDoc(doc(asTeacher(), "lesson_plans", "plan-1"), { classId: "class-2" }));
    await assertFails(updateDoc(doc(asTeacher(), "assignments", "assignment-1"), { classId: "class-2" }));
  });

  test("staff cannot rewrite student identity inside attendance and submissions", async () => {
    await assertFails(updateDoc(doc(asTeacher(), "attendance", "session-1_student-1"), { studentId: "student-2" }));
    await assertFails(updateDoc(doc(asTeacher(), "submissions", "assignment-1_student-1"), { studentId: "student-2" }));
  });

  test("staff cannot rewrite score audit or identity fields", async () => {
    await assertFails(updateDoc(doc(asTeacher(), "scores", "score-1"), { createdBy: admin }));
    await assertFails(updateDoc(doc(asTeacher(), "scores", "score-1"), { classId: "class-2" }));
  });

  test("staff cannot rewrite invoice and payment money fields", async () => {
    await assertFails(updateDoc(doc(asAdmin(), "invoices", "invoice-1"), { amount: 1 }));
    await assertFails(updateDoc(doc(asAdmin(), "payments", "payment-1"), { amount: 1, status: "verified" }));
  });

  test("valid status-only updates still pass", async () => {
    await assertSucceeds(updateDoc(doc(asTeacher(), "sessions", "session-1"), { status: "completed" }));
    await assertSucceeds(updateDoc(doc(asAdmin(), "payments", "payment-1"), { status: "verified", verifiedBy: admin }));
  });
});
