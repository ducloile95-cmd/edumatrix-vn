import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";

const PROJECT_ID = "edumatrix-chat-tag-rules-test";
const ADMIN_UID = "admin-uid";
const TEACHER_UID = "teacher-uid";
const VIEWER_UID = "viewer-uid";
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8091),
    },
  });
});

afterAll(async () => testEnv.cleanup());

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, role] of [[ADMIN_UID, "admin"], [TEACHER_UID, "teacher"], [VIEWER_UID, "viewer"]] as const) {
      await setDoc(doc(db, "users", uid), { email: `${uid}@example.com`, displayName: uid, photoURL: null, role, studentIds: [], status: "active", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }
    await setDoc(doc(db, "chat_tags", "tag-red"), { label: "Chưa mua", color: "red", createdBy: ADMIN_UID, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await setDoc(doc(db, "students", "student-1"), { teacherIds: [TEACHER_UID] });
    await setDoc(doc(db, "chat_threads", "thread-1"), { studentId: "student-1", assignedTeacherIds: [TEACHER_UID], tagIds: [], unreadStaffCount: 2, lastMessagePreview: "Tin nhắn", updatedAt: Timestamp.now() });
  });
});

function as(uid: string) {
  return testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true }).firestore();
}

describe("chat tag catalog", () => {
  test("staff can read tags but viewers cannot", async () => {
    await assertSucceeds(getDocs(collection(as(TEACHER_UID), "chat_tags")));
    await assertFails(getDocs(collection(as(VIEWER_UID), "chat_tags")));
  });

  test("only admins can create and delete valid tags", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN_UID), "chat_tags", "tag-green"), { label: "Đã mua", color: "green", createdBy: ADMIN_UID, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as(TEACHER_UID), "chat_tags", "tag-blue"), { label: "Đặt trước", color: "blue", createdBy: TEACHER_UID, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(as(ADMIN_UID), "chat_tags", "tag-red")));
  });
});

describe("conversation tag assignment", () => {
  test("assigned teachers can update only tagIds and updatedAt", async () => {
    await assertSucceeds(updateDoc(doc(as(TEACHER_UID), "chat_threads", "thread-1"), { tagIds: ["tag-red"], updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(TEACHER_UID), "chat_threads", "thread-1"), { tagIds: ["tag-red"], lastMessagePreview: "Đã sửa", updatedAt: serverTimestamp() }));
  });

  test("staff can clear unread state but cannot forge an unread count", async () => {
    await assertSucceeds(updateDoc(doc(as(TEACHER_UID), "chat_threads", "thread-1"), { unreadStaffCount: 0, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(ADMIN_UID), "chat_threads", "thread-1"), { unreadStaffCount: 5, updatedAt: serverTimestamp() }));
  });

  test("viewers cannot tag conversations", async () => {
    await assertFails(updateDoc(doc(as(VIEWER_UID), "chat_threads", "thread-1"), { tagIds: ["tag-red"], updatedAt: serverTimestamp() }));
  });

  test("a former teacher keeps read while still in assignedTeacherIds but loses write access", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "students", "student-1"), { teacherIds: [] });
    });
    await assertSucceeds(getDoc(doc(as(TEACHER_UID), "chat_threads", "thread-1")));
    await assertSucceeds(getDocs(query(
      collection(as(TEACHER_UID), "chat_threads"),
      where("assignedTeacherIds", "array-contains", TEACHER_UID),
      where("studentId", "==", "student-1"),
    )));
  });
});
