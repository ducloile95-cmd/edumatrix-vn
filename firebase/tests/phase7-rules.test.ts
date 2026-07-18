import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import fs from "node:fs"; import path from "node:path";
let env: RulesTestEnvironment;
const assignment = { title: "Bai 1", description: "", classId: "class-1", lessonPlanId: null, sessionId: null, dueAt: Timestamp.now(), submissionType: "text", maxScore: 10, status: "published", createdBy: "admin", createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
const submission = { assignmentId: "assignment-1", studentId: "student-1", classId: "class-1", submissionUrl: "", submissionText: "answer", studentNote: "", status: "submitted", score: null, teacherComment: "", checkedBy: null, submittedAt: Timestamp.now(), checkedAt: null, updatedAt: Timestamp.now() };
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "phase7-rules", firestore: { rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"), host: "localhost", port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090) } }); }); afterAll(async () => env.cleanup());
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async (ctx) => { const db = ctx.firestore(); await setDoc(doc(db,"users","admin"),{role:"admin",status:"active",studentIds:[]}); await setDoc(doc(db,"users","viewer"),{role:"viewer",status:"active",studentIds:["student-1"]}); await setDoc(doc(db,"users","other"),{role:"viewer",status:"active",studentIds:["student-2"]}); await setDoc(doc(db,"classes","class-1"),{studentIds:["student-1"]}); await setDoc(doc(db,"assignments","assignment-1"),assignment); await setDoc(doc(db,"assignments","assignment-2"),assignment); await setDoc(doc(db,"submissions","assignment-1_student-1"),submission); }); });
describe("Phase 7 assignments", () => {
 test("linked viewer reads published assignment",async()=>assertSucceeds(getDoc(doc(env.authenticatedContext("viewer").firestore(),"assignments","assignment-1"))));
 test("other viewer cannot read assignment",async()=>assertFails(getDoc(doc(env.authenticatedContext("other").firestore(),"assignments","assignment-1"))));
 test("viewer submits with deterministic id",async()=>assertSucceeds(setDoc(doc(env.authenticatedContext("viewer").firestore(),"submissions","assignment-2_student-1"),{...submission,assignmentId:"assignment-2"})));
 test("viewer cannot submit for another student",async()=>assertFails(setDoc(doc(env.authenticatedContext("viewer").firestore(),"submissions","assignment-1_student-2"),{...submission,studentId:"student-2"})));
 test("viewer cannot grade own submission",async()=>assertFails(updateDoc(doc(env.authenticatedContext("viewer").firestore(),"submissions","assignment-1_student-1"),{score:10,status:"graded",teacherComment:"ok"})));
 test("staff grades submission",async()=>assertSucceeds(updateDoc(doc(env.authenticatedContext("admin").firestore(),"submissions","assignment-1_student-1"),{score:9,status:"graded",teacherComment:"good",checkedBy:"admin"})));
 test("staff cannot grade above assignment max",async()=>assertFails(updateDoc(doc(env.authenticatedContext("admin").firestore(),"submissions","assignment-1_student-1"),{score:11,status:"graded",teacherComment:"bad",checkedBy:"admin"})));
});
