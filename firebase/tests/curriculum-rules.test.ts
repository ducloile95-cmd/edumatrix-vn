import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;

const objectives = { knowledge: "Knowledge", skills: "Skills", attitude: "Attitude" };
const preparation = { teacher: "Teacher prep", student: "Student prep" };
const activities = [
  { name: "Intro", durationMinutes: 15, content: "Intro activity", expectedOutcome: "Outcome" }
];

const standardLesson = {
  title: "Standard Lesson 1",
  subjectId: "english",
  durationMinutes: 90,
  objectives,
  preparation,
  activities,
  homework: "Do homework",
  approvalStatus: "draft",
  revision: 1,
  createdBy: "teacher-1",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};

const curriculum = {
  courseId: "course-1",
  version: 1,
  title: "Curriculum v1",
  itemIds: ["item-1"],
  itemCount: 1,
  totalDurationMinutes: 90,
  status: "draft",
  publishedBy: null,
  publishedAt: null,
  revision: 1,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};

const curriculumItem = {
  courseId: "course-1",
  curriculumVersion: 1,
  sequenceNumber: 1,
  subjectId: "english",
  title: "Lesson 1 Item",
  standardLessonId: "lesson-1",
  durationMinutes: 90,
  status: "draft",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "curriculum-rules-test",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8091),
    },
  });
});

afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", "admin-1"), { role: "admin", status: "active", studentIds: [] });
    await setDoc(doc(db, "users", "teacher-1"), { role: "teacher", status: "active", studentIds: [] });
    await setDoc(doc(db, "users", "viewer-1"), { role: "viewer", status: "active", studentIds: ["student-1"] });
    await setDoc(doc(db, "subjects", "english"), { name: "English", code: "english", status: "active" });
    await setDoc(doc(db, "courses", "course-1"), { subjectIds: ["english"], teacherIds: ["teacher-1"] });
  });
});

describe("Standard Lessons security rules", () => {
  test("Staff (teacher) can create and read standard lessons", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(setDoc(doc(db, "standard_lessons", "lesson-1"), standardLesson));
    await assertSucceeds(getDoc(doc(db, "standard_lessons", "lesson-1")));
  });

  test("Staff (admin) can create and read standard lessons", async () => {
    const db = env.authenticatedContext("admin-1").firestore();
    await assertSucceeds(setDoc(doc(db, "standard_lessons", "lesson-1"), { ...standardLesson, createdBy: "admin-1" }));
    await assertSucceeds(getDoc(doc(db, "standard_lessons", "lesson-1")));
  });

  test("Viewer cannot create or read standard lessons", async () => {
    const db = env.authenticatedContext("viewer-1").firestore();
    await assertFails(setDoc(doc(db, "standard_lessons", "lesson-1"), standardLesson));
    await assertFails(getDoc(doc(db, "standard_lessons", "lesson-1")));
  });
});

describe("Course Curricula security rules", () => {
  test("Staff can create and read course curricula", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(setDoc(doc(db, "course_curricula", "course-1_v1"), curriculum));
    await assertSucceeds(getDoc(doc(db, "course_curricula", "course-1_v1")));
  });

  test("Viewer cannot create or read course curricula", async () => {
    const db = env.authenticatedContext("viewer-1").firestore();
    await assertFails(setDoc(doc(db, "course_curricula", "course-1_v1"), curriculum));
    await assertFails(getDoc(doc(db, "course_curricula", "course-1_v1")));
  });
});

describe("Course Curriculum Items security rules", () => {
  test("Staff can create and read course curriculum items", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(setDoc(doc(db, "course_curriculum_items", "item-1"), curriculumItem));
    await assertSucceeds(getDoc(doc(db, "course_curriculum_items", "item-1")));
  });

  test("Viewer cannot create or read course curriculum items", async () => {
    const db = env.authenticatedContext("viewer-1").firestore();
    await assertFails(setDoc(doc(db, "course_curriculum_items", "item-1"), curriculumItem));
    await assertFails(getDoc(doc(db, "course_curriculum_items", "item-1")));
  });
});
