import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;
const TEACHER_UID = "query-teacher";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "query-scope-rules",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090),
    },
  });
});

afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", TEACHER_UID), { role: "teacher", status: "active", studentIds: [] });
    await setDoc(doc(db, "classes", "assigned-class"), { teacherIds: [TEACHER_UID], studentIds: ["student-1"] });
    await setDoc(doc(db, "classes", "other-class"), { teacherIds: ["other-teacher"], studentIds: ["student-2"] });
    await setDoc(doc(db, "students", "student-1"), { teacherIds: [TEACHER_UID] });
    await setDoc(doc(db, "students", "student-2"), { teacherIds: ["other-teacher"] });
    await setDoc(doc(db, "attendance", "session-1_student-1"), { sessionId: "session-1", classId: "assigned-class", studentId: "student-1" });
    await setDoc(doc(db, "attendance", "session-2_student-2"), { sessionId: "session-2", classId: "other-class", studentId: "student-2" });
    await setDoc(doc(db, "attendance_summaries", "session-1"), { sessionId: "session-1", classId: "assigned-class" });
    await setDoc(doc(db, "scores", "score-1"), { classId: "assigned-class", studentId: "student-1" });
    await setDoc(doc(db, "scores", "score-2"), { classId: "other-class", studentId: "student-2" });
    await setDoc(doc(db, "assignments", "assigned-task"), { classId: "assigned-class", status: "published" });
    await setDoc(doc(db, "assignments", "other-task"), { classId: "other-class", status: "published" });
    await setDoc(doc(db, "lesson_plans", "assigned-plan"), { classId: "assigned-class", createdBy: "other-teacher", updatedAt: Timestamp.now() });
    await setDoc(doc(db, "lesson_plans", "own-plan"), { classId: null, createdBy: TEACHER_UID, updatedAt: Timestamp.now() });
    await setDoc(doc(db, "lesson_plans", "other-plan"), { classId: "other-class", createdBy: "other-teacher", updatedAt: Timestamp.now() });
    await setDoc(doc(db, "submissions", "assigned-task_student-1"), { assignmentId: "assigned-task", classId: "assigned-class", studentId: "student-1" });
    await setDoc(doc(db, "submissions", "assigned-task_student-2"), { assignmentId: "assigned-task", classId: "other-class", studentId: "student-2" });
  });
});

function teacherDb() {
  return env.authenticatedContext(TEACHER_UID).firestore();
}

describe("teacher list query scope", () => {
  test("classes require a teacherIds array-contains constraint", async () => {
    await assertFails(getDocs(query(collection(teacherDb(), "classes"))));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "classes"),
      where("teacherIds", "array-contains", TEACHER_UID),
    )));
  });

  test("assignments require an assigned class constraint", async () => {
    await assertFails(getDocs(query(collection(teacherDb(), "assignments"))));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "assignments"),
      where("classId", "==", "assigned-class"),
    )));
  });

  test("lesson plans support assigned class and creator constraints", async () => {
    await assertFails(getDocs(query(collection(teacherDb(), "lesson_plans"))));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "lesson_plans"),
      where("classId", "==", "assigned-class"),
    )));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "lesson_plans"),
      where("createdBy", "==", TEACHER_UID),
    )));
  });

  test("submissions require both assignment and class constraints", async () => {
    await assertFails(getDocs(query(
      collection(teacherDb(), "submissions"),
      where("assignmentId", "==", "assigned-task"),
    )));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "submissions"),
      where("assignmentId", "==", "assigned-task"),
      where("classId", "==", "assigned-class"),
    )));
  });

  test("dashboard attendance must query by assigned class, not session only", async () => {
    await assertFails(getDocs(query(
      collection(teacherDb(), "attendance"),
      where("sessionId", "==", "session-1"),
    )));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "attendance"),
      where("classId", "==", "assigned-class"),
    )));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "attendance_summaries"),
      where("classId", "==", "assigned-class"),
    )));
  });

  test("dashboard scores must query by assigned class, not student only", async () => {
    await assertFails(getDocs(query(
      collection(teacherDb(), "scores"),
      where("studentId", "==", "student-1"),
    )));
    await assertSucceeds(getDocs(query(
      collection(teacherDb(), "scores"),
      where("classId", "==", "assigned-class"),
    )));
  });
});
