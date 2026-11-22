import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, writeBatch } from "firebase/firestore";
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
  itemIds: ["course-1_v1_s001"],
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
    await setDoc(doc(db, "users", "teacher-2"), { role: "teacher", status: "active", studentIds: [] });
    await setDoc(doc(db, "users", "viewer-1"), { role: "viewer", status: "active", studentIds: ["student-1"] });
    await setDoc(doc(db, "subjects", "english"), { name: "English", code: "english", status: "active" });
    await setDoc(doc(db, "courses", "course-1"), {
      name: "Course 1", subjectIds: ["english"], teacherIds: ["teacher-1"], pricePerSession: 100000,
      tuitionFee: 100000, totalSessions: 1, startDate: Timestamp.now(), endDate: Timestamp.fromMillis(Date.now() + 86400000),
      status: "active", activeCurriculumId: null, activeCurriculumVersion: null, curriculumVersionCounter: 1,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "standard_lessons", "lesson-1"), { ...standardLesson, approvalStatus: "approved" });
  });
});

describe("Standard Lessons security rules", () => {
  test("Staff (teacher) can create and read standard lessons", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(setDoc(doc(db, "standard_lessons", "lesson-new"), standardLesson));
    await assertSucceeds(getDoc(doc(db, "standard_lessons", "lesson-new")));
  });

  test("Staff (admin) can create and read standard lessons", async () => {
    const db = env.authenticatedContext("admin-1").firestore();
    await assertSucceeds(setDoc(doc(db, "standard_lessons", "lesson-admin"), { ...standardLesson, createdBy: "admin-1" }));
    await assertSucceeds(getDoc(doc(db, "standard_lessons", "lesson-admin")));
  });

  test("Viewer cannot create or read standard lessons", async () => {
    const db = env.authenticatedContext("viewer-1").firestore();
    await assertFails(setDoc(doc(db, "standard_lessons", "lesson-viewer"), standardLesson));
    await assertFails(getDoc(doc(db, "standard_lessons", "lesson-1")));
  });

  test("Staff cannot create a standard lesson for a missing subject", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertFails(setDoc(doc(db, "standard_lessons", "lesson-orphan"), {
      ...standardLesson,
      subjectId: "missing-subject",
    }));
  });
});

describe("Course Curricula security rules", () => {
  test("a teacher not assigned to the course cannot create its curriculum or items (A4)", async () => {
    const db = env.authenticatedContext("teacher-2").firestore();
    await assertFails(setDoc(doc(db, "course_curricula", "course-1_v1"), curriculum));
    await assertFails(setDoc(doc(db, "course_curriculum_items", "course-1_v1_s001"), curriculumItem));
  });

  test("Staff can create and read course curricula", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(setDoc(doc(db, "course_curricula", "course-1_v1"), curriculum));
    await assertSucceeds(getDoc(doc(db, "course_curricula", "course-1_v1")));
  });

  test("Staff cannot create a curriculum for a missing course", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertFails(setDoc(doc(db, "course_curricula", "missing-course_v1"), {
      ...curriculum,
      courseId: "missing-course",
    }));
  });

  test("Viewer cannot create or read course curricula", async () => {
    const db = env.authenticatedContext("viewer-1").firestore();
    await assertFails(setDoc(doc(db, "course_curricula", "course-1_v1"), curriculum));
    await assertFails(getDoc(doc(db, "course_curricula", "course-1_v1")));
  });

  test("Staff cannot create curriculum under a non-deterministic document id", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertFails(setDoc(doc(db, "course_curricula", "random-id"), curriculum));
  });

  test("publish can update curriculum status and course active pointer atomically", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "course_curricula", "course-1_v1"), curriculum);
    });
    const db = env.authenticatedContext("teacher-1").firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, "course_curricula", "course-1_v1"), {
      status: "published", publishedBy: "teacher-1", publishedAt: Timestamp.now(), revision: 2, updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, "courses", "course-1"), {
      activeCurriculumId: "course-1_v1", activeCurriculumVersion: 1, curriculumVersionCounter: 1, updatedAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());
  });

  test("assigned teacher cannot edit course catalog fields", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, "courses", "course-1"), {
      name: "Unauthorized rename",
      updatedAt: Timestamp.now(),
    });
    await assertFails(batch.commit());
  });
});

describe("Course Curriculum Items security rules", () => {
  test("Staff can create and read course curriculum items", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(setDoc(doc(db, "course_curriculum_items", "course-1_v1_s001"), curriculumItem));
    await assertSucceeds(getDoc(doc(db, "course_curriculum_items", "course-1_v1_s001")));
  });

  test("Viewer cannot create or read course curriculum items", async () => {
    const db = env.authenticatedContext("viewer-1").firestore();
    await assertFails(setDoc(doc(db, "course_curriculum_items", "course-1_v1_s001"), curriculumItem));
    await assertFails(getDoc(doc(db, "course_curriculum_items", "course-1_v1_s001")));
  });

  test("Staff cannot create an item whose document id differs from its identity", async () => {
    const db = env.authenticatedContext("teacher-1").firestore();
    await assertFails(setDoc(doc(db, "course_curriculum_items", "random-item"), curriculumItem));
  });

  test("Staff cannot edit an item from the active published curriculum", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "course_curricula", "course-1_v1"), { ...curriculum, status: "published" });
      await setDoc(doc(db, "course_curriculum_items", "course-1_v1_s001"), curriculumItem);
      await setDoc(doc(db, "courses", "course-1"), {
        name: "Course 1", subjectIds: ["english"], teacherIds: ["teacher-1"], pricePerSession: 100000,
        tuitionFee: 100000, totalSessions: 1, startDate: Timestamp.now(), endDate: Timestamp.fromMillis(Date.now() + 86400000),
        status: "active", activeCurriculumId: "course-1_v1", activeCurriculumVersion: 1, curriculumVersionCounter: 1,
        createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
      });
    });
    await assertFails(setDoc(
      doc(env.authenticatedContext("teacher-1").firestore(), "course_curriculum_items", "course-1_v1_s001"),
      { ...curriculumItem, title: "Mutated after publish" },
    ));
  });
});
