import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "summary-rules",
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
    await setDoc(doc(db, "users", "admin"), { role: "admin", status: "active", studentIds: [] });
    await setDoc(doc(db, "classes", "class-1"), { teacherIds: [], studentIds: ["student-1"] });
  });
});

function adminDb() {
  return env.authenticatedContext("admin").firestore();
}

describe("summary schema and ranges", () => {
  test("attendance total must equal status counts", async () => {
    const valid = {
      sessionId: "session-1",
      classId: "class-1",
      total: 2,
      present: 1,
      absent: 1,
      late: 0,
      excused: 0,
      updatedAt: Timestamp.now(),
    };
    await assertSucceeds(setDoc(doc(adminDb(), "attendance_summaries", "session-1"), valid));
    await assertFails(setDoc(doc(adminDb(), "attendance_summaries", "session-2"), {
      ...valid,
      sessionId: "session-2",
      total: 3,
    }));
  });

  test("assignment counts cannot be negative or exceed roster total", async () => {
    const valid = {
      assignmentId: "assignment-1",
      totalStudents: 2,
      submittedCount: 1,
      gradedCount: 1,
      redoCount: 0,
      updatedAt: Timestamp.now(),
    };
    await assertSucceeds(setDoc(doc(adminDb(), "assignment_summaries", "assignment-1"), valid));
    await assertFails(setDoc(doc(adminDb(), "assignment_summaries", "assignment-2"), {
      ...valid,
      assignmentId: "assignment-2",
      gradedCount: 3,
    }));
  });

  test("student score summary validates percentage and latest score", async () => {
    const valid = {
      studentId: "student-1",
      scoreCount: 1,
      totalPercent: 80,
      averagePercent: 80,
      latestScore: 8,
      latestMaxScore: 10,
      updatedAt: Timestamp.now(),
    };
    await assertSucceeds(setDoc(doc(adminDb(), "student_summaries", "student-1"), valid));
    await assertFails(setDoc(doc(adminDb(), "student_summaries", "student-2"), {
      ...valid,
      studentId: "student-2",
      latestScore: 11,
    }));
  });
});
