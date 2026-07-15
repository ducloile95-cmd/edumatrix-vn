import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;

const assignedTeacher = "teacher-1";
const otherTeacher = "teacher-2";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "teacher-scope-rules",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090),
    },
  });
});

afterAll(async () => env.cleanup());

function asTeacher(uid: string) {
  return env.authenticatedContext(uid).firestore();
}

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, "users", assignedTeacher), {
      role: "teacher",
      status: "active",
      studentIds: [],
    });
    await setDoc(doc(db, "users", otherTeacher), {
      role: "teacher",
      status: "active",
      studentIds: [],
    });
    await setDoc(doc(db, "classes", "class-owned"), {
      name: "Owned class",
      courseId: "course-1",
      subjectIds: [],
      teacherIds: [assignedTeacher],
      studentIds: ["student-1"],
      scheduleText: "",
      location: "",
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "classes", "class-other"), {
      name: "Other class",
      courseId: "course-1",
      subjectIds: [],
      teacherIds: [otherTeacher],
      studentIds: ["student-2"],
      scheduleText: "",
      location: "",
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "sessions", "session-owned"), {
      classId: "class-owned",
      title: "Session",
      startAt: Timestamp.now(),
      endAt: Timestamp.now(),
      location: "",
      status: "scheduled",
      note: "",
      makeUpForSessionId: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "attendance", "session-owned_student-1"), {
      sessionId: "session-owned",
      classId: "class-owned",
      studentId: "student-1",
      status: "present",
      note: "",
      markedBy: assignedTeacher,
      markedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "assignments", "assignment-owned"), {
      title: "Assignment",
      description: "",
      classId: "class-owned",
      lessonPlanId: null,
      sessionId: null,
      dueAt: Timestamp.now(),
      submissionType: "text",
      maxScore: 10,
      status: "published",
      createdBy: assignedTeacher,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "submissions", "assignment-owned_student-1"), {
      assignmentId: "assignment-owned",
      studentId: "student-1",
      classId: "class-owned",
      submissionUrl: "",
      submissionText: "answer",
      studentNote: "",
      status: "submitted",
      score: null,
      teacherComment: "",
      checkedBy: null,
      submittedAt: Timestamp.now(),
      checkedAt: null,
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "scores", "score-owned"), {
      studentId: "student-1",
      classId: "class-owned",
      subjectId: "subject-1",
      assessmentName: "Quiz",
      assessmentType: "quiz",
      score: 8,
      maxScore: 10,
      teacherComment: "",
      createdBy: assignedTeacher,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
});

describe("teacher scope by assigned class", () => {
  test("teacher reads only assigned classes", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(assignedTeacher), "classes", "class-owned")));
    await assertFails(getDoc(doc(asTeacher(otherTeacher), "classes", "class-owned")));
  });

  test("teacher creates sessions only for assigned classes", async () => {
    await assertSucceeds(
      setDoc(doc(asTeacher(assignedTeacher), "sessions", "session-new-owned"), {
        classId: "class-owned",
        title: "New",
        startAt: Timestamp.now(),
        endAt: Timestamp.now(),
        location: "",
        status: "scheduled",
        note: "",
        makeUpForSessionId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );

    await assertFails(
      setDoc(doc(asTeacher(assignedTeacher), "sessions", "session-new-other"), {
        classId: "class-other",
        title: "New",
        startAt: Timestamp.now(),
        endAt: Timestamp.now(),
        location: "",
        status: "scheduled",
        note: "",
        makeUpForSessionId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  test("teacher updates attendance only for assigned classes", async () => {
    await assertSucceeds(
      updateDoc(doc(asTeacher(assignedTeacher), "attendance", "session-owned_student-1"), {
        status: "late",
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      updateDoc(doc(asTeacher(otherTeacher), "attendance", "session-owned_student-1"), {
        status: "absent",
        updatedAt: Timestamp.now(),
      }),
    );
  });

  test("teacher grades submissions only for assigned classes", async () => {
    await assertSucceeds(
      updateDoc(doc(asTeacher(assignedTeacher), "submissions", "assignment-owned_student-1"), {
        score: 9,
        status: "graded",
        teacherComment: "Good",
        checkedBy: assignedTeacher,
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      updateDoc(doc(asTeacher(otherTeacher), "submissions", "assignment-owned_student-1"), {
        score: 7,
        status: "graded",
        teacherComment: "No access",
        checkedBy: otherTeacher,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  test("teacher writes scores only for assigned classes", async () => {
    await assertSucceeds(
      setDoc(doc(asTeacher(assignedTeacher), "scores", "score-new-owned"), {
        studentId: "student-1",
        classId: "class-owned",
        subjectId: "subject-1",
        assessmentName: "Quiz 2",
        assessmentType: "quiz",
        score: 9,
        maxScore: 10,
        teacherComment: "",
        createdBy: assignedTeacher,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      setDoc(doc(asTeacher(assignedTeacher), "scores", "score-new-other"), {
        studentId: "student-2",
        classId: "class-other",
        subjectId: "subject-1",
        assessmentName: "Quiz 2",
        assessmentType: "quiz",
        score: 9,
        maxScore: 10,
        teacherComment: "",
        createdBy: assignedTeacher,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });
});
