import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, documentId, getDoc, getDocs, orderBy, query, setDoc, Timestamp, where } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

// Dot 3 (spec A3, Q4): giao vien chi doc du lieu lop/hoc sinh duoc phan cong.
// Moi truy van o day mo phong dung dang truy van client dung cho giao vien (src/services/firestore).
let env: RulesTestEnvironment;
const A = "teacher-a";
const B = "teacher-b";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "teacher-read-scope",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8091),
    },
  });
});

afterAll(async () => env.cleanup());

const now = Timestamp.now();
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const put = (path: string, data: Record<string, unknown>) => setDoc(doc(db, path), data);
    await put("users/admin", { role: "admin", status: "active", studentIds: [], createdAt: now });
    await put(`users/${A}`, { role: "teacher", status: "active", studentIds: [], createdAt: now });
    await put(`users/${B}`, { role: "teacher", status: "active", studentIds: [], createdAt: now });
    await put("users/parent-1", { role: "viewer", status: "active", studentIds: ["s1"], createdAt: now });
    await put("users/parent-2", { role: "viewer", status: "active", studentIds: ["s2"], createdAt: now });
    await put("users/parent-multi", { role: "viewer", status: "active", studentIds: ["s2", "s3", "s1"], createdAt: now });
    for (const [n, teacher] of [["1", A], ["2", B]] as const) {
      const c = `c${n}`; const s = `s${n}`;
      await put(`classes/${c}`, { teacherIds: [teacher], studentIds: [s], courseId: "course-1", status: "active", name: c });
      await put(`students/${s}`, { teacherIds: [teacher], fullName: s, currentClassIds: [c], parentUids: [`parent-${n}`] });
      await put(`enrollments/${c}_${s}`, { classId: c, studentId: s, status: "active" });
      await put(`sessions/sess-${n}`, { classId: c, startAt: now, endAt: now, status: "scheduled" });
      await put(`session_interactions/sess-${n}`, { classId: c, sessionId: `sess-${n}` });
      await put(`session_student_reviews/sess-${n}_${s}`, { classId: c, sessionId: `sess-${n}`, studentId: s });
      await put(`attendance/sess-${n}_${s}`, { classId: c, sessionId: `sess-${n}`, studentId: s, markedAt: now, status: "present" });
      await put(`attendance_summaries/sess-${n}`, { classId: c, sessionId: `sess-${n}` });
      await put(`assignments/task-${n}`, { classId: c, status: "published", dueAt: now });
      await put(`submissions/task-${n}_${s}`, { classId: c, assignmentId: `task-${n}`, studentId: s, submittedAt: now });
      await put(`scores/score-${n}`, { classId: c, studentId: s, createdAt: now });
      await put(`student_summaries/${s}`, { studentId: s });
      await put(`lesson_plans/plan-${n}`, { classId: c, createdBy: "someone", updatedAt: now });
      await put(`lesson_plan_public/plan-${n}`, { classId: c, publishedAt: now });
      await put(`invoices/inv-${n}`, { studentId: s, dueAt: now });
      await put(`payments/pay-${n}`, { studentId: s, invoiceId: `inv-${n}` });
      await put(`announcements/ann-${n}`, { studentId: s, classId: c, createdAt: now });
      await put(`announcements/class-ann-${n}`, { studentId: null, classId: c, createdAt: now });
      await put(`messenger_delivery_events/evt-${n}`, { studentId: s });
      await put(`link_requests/parent-${n}`, { uid: `parent-${n}` });
      await put(`chat_threads/thread-${n}`, { assignedTeacherIds: [teacher], studentId: s, lastMessageAt: now });
    }
    await put("students/s3", { teacherIds: [B], fullName: "s3", currentClassIds: ["c2"], parentUids: ["parent-multi"] });
  });
});

const asA = () => env.authenticatedContext(A).firestore();
const asAdmin = () => env.authenticatedContext("admin").firestore();

describe("teacher single-document reads", () => {
  const pairs: Array<[string, string]> = [
    ["students/s1", "students/s2"], ["classes/c1", "classes/c2"], ["enrollments/c1_s1", "enrollments/c2_s2"],
    ["sessions/sess-1", "sessions/sess-2"], ["session_interactions/sess-1", "session_interactions/sess-2"],
    ["session_student_reviews/sess-1_s1", "session_student_reviews/sess-2_s2"],
    ["attendance/sess-1_s1", "attendance/sess-2_s2"], ["attendance_summaries/sess-1", "attendance_summaries/sess-2"],
    ["assignments/task-1", "assignments/task-2"], ["submissions/task-1_s1", "submissions/task-2_s2"],
    ["scores/score-1", "scores/score-2"], ["student_summaries/s1", "student_summaries/s2"],
    ["lesson_plans/plan-1", "lesson_plans/plan-2"], ["lesson_plan_public/plan-1", "lesson_plan_public/plan-2"],
    ["invoices/inv-1", "invoices/inv-2"], ["payments/pay-1", "payments/pay-2"],
    ["announcements/ann-1", "announcements/ann-2"], ["announcements/class-ann-1", "announcements/class-ann-2"],
    ["messenger_delivery_events/evt-1", "messenger_delivery_events/evt-2"], ["chat_threads/thread-1", "chat_threads/thread-2"],
  ];
  for (const [own, other] of pairs) {
    test(`${own.split("/")[0]}: own class readable, other class denied`, async () => {
      await assertSucceeds(getDoc(doc(asA(), own)));
      await assertFails(getDoc(doc(asA(), other)));
      await assertSucceeds(getDoc(doc(asAdmin(), other)));
    });
  }

  test("link requests are admin or owner only", async () => {
    await assertFails(getDoc(doc(asA(), "link_requests/parent-1")));
    await assertSucceeds(getDoc(doc(asAdmin(), "link_requests/parent-1")));
  });
});

describe("teacher list queries match the client query shapes", () => {
  const c1 = (name: string, ...rest: Parameters<typeof where>[]) => query(collection(asA(), name), where("classId", "==", "c1"), ...rest.map((args) => where(...args)));

  test("assigned-only queries succeed", async () => {
    await assertSucceeds(getDocs(query(collection(asA(), "students"), where("teacherIds", "array-contains", A))));
    await assertSucceeds(getDocs(query(collection(asA(), "classes"), where("teacherIds", "array-contains", A))));
    await assertSucceeds(getDocs(query(collection(asA(), "sessions"), where("classId", "==", "c1"), where("startAt", ">=", Timestamp.fromMillis(0)), orderBy("startAt"))));
    await assertSucceeds(getDocs(c1("attendance", ["sessionId", "in", ["sess-1"]])));
    await assertSucceeds(getDocs(c1("attendance", ["studentId", "in", ["s1"]])));
    await assertSucceeds(getDocs(c1("attendance_summaries", ["sessionId", "in", ["sess-1"]])));
    await assertSucceeds(getDocs(c1("assignments")));
    await assertSucceeds(getDocs(c1("submissions", ["studentId", "in", ["s1"]])));
    await assertSucceeds(getDocs(c1("scores")));
    await assertSucceeds(getDocs(c1("lesson_plans")));
    await assertSucceeds(getDocs(query(collection(asA(), "lesson_plans"), where("createdBy", "==", A))));
    await assertSucceeds(getDocs(c1("lesson_plan_public")));
    await assertSucceeds(getDocs(c1("session_student_reviews", ["sessionId", "==", "sess-1"])));
    await assertSucceeds(getDocs(query(collection(asA(), "invoices"), where("studentId", "==", "s1"))));
    await assertSucceeds(getDocs(query(collection(asA(), "payments"), where("studentId", "==", "s1"))));
    await assertSucceeds(getDocs(query(collection(asA(), "student_summaries"), where(documentId(), "in", ["s1"]))));
    // subscribeChatThreads (src/services/firestore/chat.ts) cho giao vien.
    await assertSucceeds(getDocs(query(collection(asA(), "chat_threads"), where("assignedTeacherIds", "array-contains", A), orderBy("lastMessageAt", "desc"))));
  });

  test("unscoped or other-class queries are denied for teachers, allowed for admin", async () => {
    for (const name of ["chat_threads", "students", "classes", "sessions", "attendance", "assignments", "submissions", "scores", "invoices", "payments", "enrollments", "announcements"]) {
      await assertFails(getDocs(collection(asA(), name)));
      await assertSucceeds(getDocs(collection(asAdmin(), name)));
    }
    await assertFails(getDocs(query(collection(asA(), "attendance"), where("classId", "==", "c2"))));
    await assertFails(getDocs(query(collection(asA(), "invoices"), where("studentId", "==", "s2"))));
  });
});

describe("users visible to a teacher", () => {
  test("own profile, staff directory and parents of assigned students only", async () => {
    await assertSucceeds(getDoc(doc(asA(), `users/${A}`)));
    await assertSucceeds(getDoc(doc(asA(), "users/admin")));
    await assertSucceeds(getDoc(doc(asA(), `users/${B}`)));
    await assertSucceeds(getDoc(doc(asA(), "users/parent-1")));
    await assertSucceeds(getDoc(doc(asA(), "users/parent-multi"))); // con thu 3 (s1) thuoc lop cua A
    await assertFails(getDoc(doc(asA(), "users/parent-2")));
  });

  test("teacher queries: staff by role and parents by id; no full scan", async () => {
    await assertSucceeds(getDocs(query(collection(asA(), "users"), where("role", "in", ["admin", "teacher"]))));
    await assertSucceeds(getDocs(query(collection(asA(), "users"), where(documentId(), "in", ["parent-1"]))));
    await assertFails(getDocs(query(collection(asA(), "users"), orderBy("createdAt", "desc"))));
    await assertSucceeds(getDocs(query(collection(asAdmin(), "users"), orderBy("createdAt", "desc"))));
  });
});

describe("reading documents that do not exist yet (transactions create them)", () => {
  // enrollStudent, saveClassScores, gradeSubmission, registerLeave, publishClassroomInteraction, createStudent
  // deu transaction.get() mot doc moi truoc khi ghi.
  test("an assigned teacher can probe a missing doc in every write-flow collection", async () => {
    for (const path of ["enrollments/c1_new", "scores/new-score", "attendance/sess-1_new", "attendance_summaries/new-session",
      "session_student_reviews/sess-1_new", "students/new-student", "submissions/new", "student_summaries/new",
      "invoices/new", "lesson_plans/new", "assignments/new", "sessions/new", "announcements/new"]) {
      await assertSucceeds(getDoc(doc(asA(), path)));
    }
  });

  test("a parent can probe a missing payment before reporting one", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("parent-1").firestore(), "payments/new-payment")));
  });

  test("a parent still cannot read existing data of another family", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("parent-1").firestore(), "payments/pay-2")));
  });
});
