import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

// Dot 5: A4 (mau giao an), A5 (link_requests), A6 (audit_logs), A8 (delivery events).
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "wave5-rules",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8091),
    },
  });
});
afterAll(async () => env.cleanup());

const template = {
  name: "Mau", objectives: { knowledge: "k", skills: "s", attitude: "a" }, preparation: { teacher: "t", student: "s" },
  activities: [], homework: "", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
};
const linkRequest = {
  email: "parent@example.com", parentName: "Phu huynh", phone: "0900000000", relationship: "mother",
  children: [{ fullName: "Con" }], status: "pending", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
};

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/admin"), { role: "admin", status: "active", studentIds: [] });
    await setDoc(doc(db, "users/teacher-a"), { role: "teacher", status: "active", studentIds: [] });
    await setDoc(doc(db, "users/teacher-b"), { role: "teacher", status: "active", studentIds: [] });
    await setDoc(doc(db, "lesson_plan_templates/owned-by-a"), { ...template, ownerUid: "teacher-a" });
    await setDoc(doc(db, "lesson_plan_templates/legacy"), template);
    await setDoc(doc(db, "link_requests/parent-1"), linkRequest);
    await setDoc(doc(db, "students/s1"), { teacherIds: ["teacher-a"] });
    await setDoc(doc(db, "students/s2"), { teacherIds: ["teacher-b"] });
  });
});

const as = (uid: string) => env.authenticatedContext(uid, { email: "parent@example.com", email_verified: true }).firestore();

describe("lesson plan templates (A4)", () => {
  test("new templates carry the creator as owner", async () => {
    await assertSucceeds(addDoc(collection(as("teacher-a"), "lesson_plan_templates"), { ...template, ownerUid: "teacher-a" }));
    await assertFails(addDoc(collection(as("teacher-a"), "lesson_plan_templates"), template));
    await assertFails(addDoc(collection(as("teacher-a"), "lesson_plan_templates"), { ...template, ownerUid: "teacher-b" }));
  });
  test("only the owner or an admin edits a template; legacy templates are admin-only", async () => {
    await assertSucceeds(updateDoc(doc(as("teacher-a"), "lesson_plan_templates/owned-by-a"), { name: "Sua", updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(as("teacher-b"), "lesson_plan_templates/owned-by-a"), { name: "Sua", updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(as("teacher-a"), "lesson_plan_templates/owned-by-a"), { ownerUid: "teacher-b", updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(as("teacher-a"), "lesson_plan_templates/legacy"), { name: "Sua", updatedAt: Timestamp.now() }));
    await assertSucceeds(updateDoc(doc(as("admin"), "lesson_plan_templates/legacy"), { name: "Sua", updatedAt: Timestamp.now() }));
  });
});

describe("link request owner edits (A5)", () => {
  test("the owner may fix details of a pending request but not the email or shape", async () => {
    const db = as("parent-1");
    await assertSucceeds(updateDoc(doc(db, "link_requests/parent-1"), { children: [{ fullName: "Ten dung" }], updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(db, "link_requests/parent-1"), { email: "other@example.com", updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(db, "link_requests/parent-1"), { injected: true, updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(db, "link_requests/parent-1"), { children: Array.from({ length: 6 }, (_, i) => ({ fullName: `c${i}` })), updatedAt: Timestamp.now() }));
  });
});

describe("audit logs (A6)", () => {
  const entry = { action: "invite_created", actorUid: "teacher-a", actorEmail: "", targetType: "invite", targetId: "x", meta: {}, createdAt: serverTimestamp() };
  test("only known actions by the signed-in actor", async () => {
    await assertSucceeds(addDoc(collection(as("teacher-a"), "audit_logs"), entry));
    await assertFails(addDoc(collection(as("teacher-a"), "audit_logs"), { ...entry, action: "made_up_action" }));
    await assertFails(addDoc(collection(as("teacher-a"), "audit_logs"), { ...entry, actorUid: "admin" }));
    await assertFails(addDoc(collection(as("teacher-a"), "audit_logs"), { ...entry, targetType: "anything" }));
  });
});

describe("messenger delivery events (A8)", () => {
  test("a teacher cannot queue an event for a student they do not teach", async () => {
    const event = (studentId: string) => ({
      eventType: "session_schedule_changed", entityId: "e", sourceId: "e", studentId, version: 1, actorUid: "teacher-a",
      idempotencyKey: "k", status: "pending", attempts: 0, lastErrorCode: null, leaseUntil: null,
      nextAttemptAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await assertFails(setDoc(doc(as("teacher-a"), "messenger_delivery_events/session_schedule_changed:e:v1"), event("s2")));
  });
});
