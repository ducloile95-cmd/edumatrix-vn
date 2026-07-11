import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;
const session = { classId: "class-1", title: "Buoi 1", startAt: Timestamp.now(), endAt: Timestamp.now(), location: "P1", status: "scheduled", note: "", makeUpForSessionId: null, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "phase4-rules", firestore: { rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"), host: "localhost", port: 8090 } }); });
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
  test("linked viewer reads a session", async () => assertSucceeds(getDoc(doc(env.authenticatedContext("viewer").firestore(), "sessions", "session-1"))));
  test("unlinked viewer cannot read a session", async () => assertFails(getDoc(doc(env.authenticatedContext("other").firestore(), "sessions", "session-1"))));
  test("viewer cannot create a session", async () => assertFails(setDoc(doc(env.authenticatedContext("viewer").firestore(), "sessions", "session-2"), session)));
});
