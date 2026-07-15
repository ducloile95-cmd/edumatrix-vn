import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;
const plan = { title: "Giao an 1", classId: "class-1", courseId: null, subjectId: null, sessionId: null, sections: [{ title: "Muc tieu", content: "Noi dung" }], publicSummary: "Tom tat", status: "published", createdBy: "admin", createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "phase5-rules", firestore: { rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"), host: "localhost", port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090) } }); });
afterAll(async () => env.cleanup());
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async (ctx) => { const db = ctx.firestore(); await setDoc(doc(db, "users", "admin"), { role: "admin", status: "active", studentIds: [] }); await setDoc(doc(db, "users", "viewer"), { role: "viewer", status: "active", studentIds: ["student-1"] }); await setDoc(doc(db, "users", "other"), { role: "viewer", status: "active", studentIds: ["student-2"] }); await setDoc(doc(db, "classes", "class-1"), { studentIds: ["student-1"] }); await setDoc(doc(db, "lesson_plans", "published"), plan); await setDoc(doc(db, "lesson_plans", "draft"), { ...plan, status: "draft" }); await setDoc(doc(db, "lesson_plan_public", "published"), { lessonPlanId: "published", title: plan.title, classId: "class-1", publicSummary: plan.publicSummary, publishedAt: Timestamp.now() }); }); });

describe("Phase 5 lesson plan visibility", () => {
  test("staff creates lesson plan", async () => assertSucceeds(setDoc(doc(env.authenticatedContext("admin").firestore(), "lesson_plans", "new"), plan)));
  test("linked viewer reads public summary", async () => assertSucceeds(getDoc(doc(env.authenticatedContext("viewer").firestore(), "lesson_plan_public", "published"))));
  test("viewer cannot read internal lesson plan", async () => assertFails(getDoc(doc(env.authenticatedContext("viewer").firestore(), "lesson_plans", "published"))));
  test("unlinked viewer cannot read public summary", async () => assertFails(getDoc(doc(env.authenticatedContext("other").firestore(), "lesson_plan_public", "published"))));
  test("viewer cannot create template", async () => assertFails(setDoc(doc(env.authenticatedContext("viewer").firestore(), "lesson_plan_templates", "template"), { name: "Mau", sections: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now() })));
});
