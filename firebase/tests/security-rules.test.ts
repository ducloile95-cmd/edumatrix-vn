import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, Timestamp } from "firebase/firestore";

/**
 * Emulator test cho Firestore Security Rules (A16, A28).
 * Chay bang: npm run test:rules (tu dong bat Firestore Emulator).
 */

const PROJECT_ID = "edumatrix-vn-rules-test";
let testEnv: RulesTestEnvironment;

const ADMIN_UID = "admin-uid";
const ADMIN_EMAIL = "admin@edumatrix.vn";
const TEACHER_UID = "teacher-uid";
const TEACHER_EMAIL = "teacher@edumatrix.vn";
const VIEWER_UID = "viewer-uid";
const VIEWER_EMAIL = "parent@gmail.com";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed du lieu goc bang quyen bypass rules (khong tinh vao ket qua test).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", ADMIN_UID), {
      email: ADMIN_EMAIL,
      displayName: "Admin",
      photoURL: null,
      role: "admin",
      studentIds: [],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users", TEACHER_UID), {
      email: TEACHER_EMAIL,
      displayName: "Teacher",
      photoURL: null,
      role: "teacher",
      studentIds: [],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
});

function asAdmin() {
  return testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL, email_verified: true }).firestore();
}
function asTeacher() {
  return testEnv.authenticatedContext(TEACHER_UID, { email: TEACHER_EMAIL, email_verified: true }).firestore();
}
function asViewer(uid = VIEWER_UID, email = VIEWER_EMAIL) {
  return testEnv.authenticatedContext(uid, { email, email_verified: true }).firestore();
}
function asUnauthenticated() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seedInvite(status: "active" | "claimed" | "revoked" = "active") {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "invites", VIEWER_EMAIL), {
      email: VIEWER_EMAIL,
      role: "viewer",
      studentIds: ["student_001"],
      status,
      createdBy: ADMIN_UID,
      createdAt: Timestamp.now(),
    });
  });
}

describe("unauthenticated", () => {
  test("khong doc duoc users", async () => {
    await assertFails(getDoc(doc(asUnauthenticated(), "users", ADMIN_UID)));
  });
  test("khong doc duoc invites", async () => {
    await assertFails(getDoc(doc(asUnauthenticated(), "invites", VIEWER_EMAIL)));
  });
});

describe("invite claim", () => {
  test("khong co invite thi khong tu tao duoc ho so", async () => {
    await assertFails(
      setDoc(doc(asViewer(), "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "viewer",
        studentIds: [],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("claim dung role/studentIds tu invite active thi thanh cong", async () => {
    await seedInvite("active");
    await assertSucceeds(
      setDoc(doc(asViewer(), "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "viewer",
        studentIds: ["student_001"],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("tu doi role khac invite thi bi tu choi", async () => {
    await seedInvite("active");
    await assertFails(
      setDoc(doc(asViewer(), "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "admin",
        studentIds: ["student_001"],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("tu them studentIds khac invite thi bi tu choi", async () => {
    await seedInvite("active");
    await assertFails(
      setDoc(doc(asViewer(), "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "viewer",
        studentIds: ["student_001", "student_999"],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("invite da claimed thi khong claim lai duoc", async () => {
    await seedInvite("claimed");
    await assertFails(
      setDoc(doc(asViewer(), "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "viewer",
        studentIds: ["student_001"],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("nguoi duoc moi tu danh dau invite cua minh la claimed", async () => {
    await seedInvite("active");
    await assertSucceeds(
      updateDoc(doc(asViewer(), "invites", VIEWER_EMAIL), {
        status: "claimed",
        claimedAt: serverTimestamp(),
      }),
    );
  });

  test("nguoi duoc moi khong tu doi role cua invite", async () => {
    await seedInvite("active");
    await assertFails(updateDoc(doc(asViewer(), "invites", VIEWER_EMAIL), { role: "admin" }));
  });
});

describe("viewer khong nang quyen", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "viewer",
        studentIds: ["student_001"],
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  test("duoc sua displayName cua chinh minh", async () => {
    await assertSucceeds(
      updateDoc(doc(asViewer(), "users", VIEWER_UID), {
        displayName: "Ten moi",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("khong duoc tu doi role", async () => {
    await assertFails(updateDoc(doc(asViewer(), "users", VIEWER_UID), { role: "admin" }));
  });

  test("khong duoc tu doi studentIds", async () => {
    await assertFails(
      updateDoc(doc(asViewer(), "users", VIEWER_UID), { studentIds: ["student_999"] }),
    );
  });

  test("khong duoc tu mo khoa tai khoan cua minh", async () => {
    await assertFails(updateDoc(doc(asViewer(), "users", VIEWER_UID), { status: "disabled" }));
  });
});

describe("phan quyen Admin/Teacher", () => {
  test("Admin tao duoc invite", async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), "invites", VIEWER_EMAIL), {
        email: VIEWER_EMAIL,
        role: "viewer",
        studentIds: ["student_001"],
        status: "active",
        createdBy: ADMIN_UID,
        createdAt: serverTimestamp(),
      }),
    );
  });

  test("Teacher khong tao duoc invite", async () => {
    await assertFails(
      setDoc(doc(asTeacher(), "invites", VIEWER_EMAIL), {
        email: VIEWER_EMAIL,
        role: "viewer",
        studentIds: [],
        status: "active",
        createdBy: TEACHER_UID,
        createdAt: serverTimestamp(),
      }),
    );
  });

  test("Admin khoa duoc tai khoan nguoi khac", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "viewer",
        studentIds: [],
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    await assertSucceeds(
      updateDoc(doc(asAdmin(), "users", VIEWER_UID), {
        status: "disabled",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("Tai khoan Admin bi disabled thi mat quyen admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "users", ADMIN_UID), { status: "disabled" });
    });
    await assertFails(
      setDoc(doc(asAdmin(), "invites", "someone@gmail.com"), {
        email: "someone@gmail.com",
        role: "viewer",
        studentIds: [],
        status: "active",
        createdBy: ADMIN_UID,
        createdAt: serverTimestamp(),
      }),
    );
  });
});
