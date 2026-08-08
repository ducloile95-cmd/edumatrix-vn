import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;
const session = { classId: "class-1", title: "Buoi 1", startAt: Timestamp.now(), endAt: Timestamp.now(), location: "P1", status: "scheduled", note: "", makeUpForSessionId: null, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "phase4-rules", firestore: { rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"), host: "localhost", port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8091) } }); });
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", "admin"), { role: "admin", status: "active", studentIds: [] });
    await setDoc(doc(db, "users", "viewer"), { role: "viewer", status: "active", studentIds: ["student-1"] });
    await setDoc(doc(db, "users", "other"), { role: "viewer", status: "active", studentIds: ["student-2"] });
    await setDoc(doc(db, "classes", "class-1"), { studentIds: ["student-1"] });
    await setDoc(doc(db, "sessions", "session-1"), session);
  });
});

describe("Phase 4 session ownership", () => {
  test("staff creates a session", async () => assertSucceeds(setDoc(doc(env.authenticatedContext("admin").firestore(), "sessions", "session-2"), session)));
  test("admin creates an active class with its first session atomically", async () => {
    const db = env.authenticatedContext("admin").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "classes", "class-batch"), {
      name: "Lop batch",
      courseId: "course-1",
      subjectIds: [],
      teacherIds: [],
      studentIds: [],
      scheduleText: "",
      location: "P1",
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    batch.set(doc(db, "sessions", "session-batch"), { ...session, classId: "class-batch" });
    await assertSucceeds(batch.commit());
  });
  test("linked viewer reads a session", async () => assertSucceeds(getDoc(doc(env.authenticatedContext("viewer").firestore(), "sessions", "session-1"))));
  test("unlinked viewer cannot read a session", async () => assertFails(getDoc(doc(env.authenticatedContext("other").firestore(), "sessions", "session-1"))));
  test("viewer cannot create a session", async () => assertFails(setDoc(doc(env.authenticatedContext("viewer").firestore(), "sessions", "session-2"), session)));
  test("staff cannot create a session ending before it starts", async () => assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "sessions", "session-2"), { ...session, startAt: Timestamp.fromMillis(Date.now()), endAt: Timestamp.fromMillis(Date.now() - 60_000) })));
  test("staff cannot create a session for a cancelled class", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "classes", "class-1"), { studentIds: ["student-1"], status: "cancelled" });
    });
    await assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "sessions", "session-2"), session));
  });
  test("staff can only cancel an existing session after its class is cancelled", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "classes", "class-1"), { studentIds: ["student-1"], status: "cancelled" });
    });
    const sessionRef = doc(env.authenticatedContext("admin").firestore(), "sessions", "session-1");
    await assertFails(updateDoc(sessionRef, { location: "P2", updatedAt: Timestamp.now() }));
    await assertSucceeds(updateDoc(sessionRef, { status: "cancelled", note: "Lớp đã hủy", updatedAt: Timestamp.now() }));
  });
});
