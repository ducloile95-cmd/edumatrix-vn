import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;
const attendance = { sessionId: "session-1", classId: "class-1", studentId: "student-1", status: "present", note: "", markedBy: "admin", markedAt: Timestamp.now(), updatedAt: Timestamp.now() };
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "phase6-rules", firestore: { rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"), host: "localhost", port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090) } }); });
afterAll(async () => env.cleanup());
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async (ctx) => { const db = ctx.firestore(); await setDoc(doc(db, "users", "admin"), { role: "admin", status: "active", studentIds: [] }); await setDoc(doc(db, "users", "viewer"), { role: "viewer", status: "active", studentIds: ["student-1"] }); await setDoc(doc(db, "users", "other"), { role: "viewer", status: "active", studentIds: ["student-2"] }); await setDoc(doc(db, "classes", "class-1"), { studentIds: ["student-1"] }); await setDoc(doc(db, "attendance", "session-1_student-1"), attendance); await setDoc(doc(db, "attendance_summaries", "session-1"), { sessionId: "session-1", classId: "class-1", total: 1, present: 1, absent: 0, late: 0, excused: 0, updatedAt: Timestamp.now() }); await setDoc(doc(db, "announcements", "attendance_session-1_student-1"), { type: "attendance_alert", sessionId: "session-1", classId: "class-1", studentId: "student-1", title: "Vắng mặt", message: "", createdAt: Timestamp.now() }); }); });

describe("Phase 6 attendance ownership", () => {
  test("staff creates deterministic attendance", async () => assertSucceeds(setDoc(doc(env.authenticatedContext("admin").firestore(), "attendance", "session-2_student-1"), { ...attendance, sessionId: "session-2" })));
  test("wrong attendance id is rejected", async () => assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "attendance", "wrong"), attendance)));
  test("linked viewer reads own attendance", async () => assertSucceeds(getDoc(doc(env.authenticatedContext("viewer").firestore(), "attendance", "session-1_student-1"))));
  test("other viewer cannot read attendance", async () => assertFails(getDoc(doc(env.authenticatedContext("other").firestore(), "attendance", "session-1_student-1"))));
  test("viewer cannot edit attendance", async () => assertFails(updateDoc(doc(env.authenticatedContext("viewer").firestore(), "attendance", "session-1_student-1"), { status: "absent" })));
  test("linked viewer reads class summary", async () => assertSucceeds(getDoc(doc(env.authenticatedContext("viewer").firestore(), "attendance_summaries", "session-1"))));
  test("staff can refresh an existing deterministic attendance alert", async () => assertSucceeds(updateDoc(doc(env.authenticatedContext("admin").firestore(), "announcements", "attendance_session-1_student-1"), { title: "Đi muộn", message: "Đến muộn 10 phút", createdAt: Timestamp.now() })));
  test("staff cannot move an attendance alert to another student", async () => assertFails(updateDoc(doc(env.authenticatedContext("admin").firestore(), "announcements", "attendance_session-1_student-1"), { studentId: "student-2" })));
});
