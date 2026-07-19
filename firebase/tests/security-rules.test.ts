import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, documentId, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, Timestamp, where } from "firebase/firestore";

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
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090),
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

describe("chat and message outbox", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "chat_threads", "thread_assigned"), { assignedTeacherIds: [TEACHER_UID], parentUid: VIEWER_UID, studentId: "student_001" });
      await setDoc(doc(db, "chat_threads", "thread_other"), { assignedTeacherIds: ["other-teacher"], parentUid: "other-parent", studentId: "student_002" });
      await setDoc(doc(db, "chat_threads", "thread_assigned", "messages", "message_1"), { direction: "inbound", text: "Xin chao" });
      await setDoc(doc(db, "message_outbox", "own_message"), { actorUid: TEACHER_UID, status: "sent" });
      await setDoc(doc(db, "message_outbox", "other_message"), { actorUid: "other-teacher", status: "sent" });
    });
  });

  test("Admin doc duoc moi thread", async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), "chat_threads", "thread_other")));
  });

  test("Teacher chi doc thread duoc phan cong", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), "chat_threads", "thread_assigned")));
    await assertFails(getDoc(doc(asTeacher(), "chat_threads", "thread_other")));
  });

  test("Teacher doc message trong thread duoc phan cong", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), "chat_threads", "thread_assigned", "messages", "message_1")));
  });

  test("Viewer khong doc duoc chat", async () => {
    await assertFails(getDoc(doc(asViewer(), "chat_threads", "thread_assigned")));
  });

  test("Teacher chi doc outbox cua chinh minh", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), "message_outbox", "own_message")));
    await assertFails(getDoc(doc(asTeacher(), "message_outbox", "other_message")));
  });

  test("Client khong duoc gia mao message hoac outbox", async () => {
    await assertFails(setDoc(doc(asAdmin(), "chat_threads", "new_thread"), { assignedTeacherIds: [] }));
    await assertFails(setDoc(doc(asTeacher(), "message_outbox", "fake"), { actorUid: TEACHER_UID, status: "sent" }));
  });
});

describe("admin settings", () => {
  test("Admin ghi payment settings hop le", async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), "settings", "payment"), {
      bankBin: "970436",
      bankName: "Vietcombank",
      accountNumber: "012345678901",
      accountName: "EDUMATRIX VIET NAM",
      contentTemplate: "{invoiceCode} {studentCode}",
      vietQrTemplate: "compact2",
      updatedAt: serverTimestamp(),
    }));
  });

  test("Teacher chi doc public integration config va khong duoc ghi", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), "settings", "integrations"), {
      facebookPageId: "page-id",
      driveFolderId: "folder-id",
      webhookUrl: "https://example.com/webhook",
      updatedAt: Timestamp.now(),
    }));
    await assertSucceeds(getDoc(doc(asTeacher(), "settings", "integrations")));
    await assertFails(getDoc(doc(asTeacher(), "settings", "payment")));
    await assertFails(setDoc(doc(asTeacher(), "settings", "integrations"), {
      facebookPageId: "page-id",
      driveFolderId: "folder-id",
      webhookUrl: "https://example.com/webhook",
      updatedAt: serverTimestamp(),
    }));
  });

  test("Admin khong luu field secret ngoai schema", async () => {
    await assertFails(setDoc(doc(asAdmin(), "settings", "integrations"), {
      facebookPageId: "page-id",
      driveFolderId: "folder-id",
      webhookUrl: "https://example.com/webhook",
      accessToken: "must-not-be-stored",
      updatedAt: serverTimestamp(),
    }));
  });
});

describe("teacher operational directory", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "users", "teacher-colleague"), {
        email: "colleague@edumatrix.vn",
        displayName: "Teacher Colleague",
        photoURL: null,
        role: "teacher",
        studentIds: [],
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await setDoc(doc(db, "users", VIEWER_UID), {
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

  test("Teacher doc duoc ho so phu huynh va giao vien khac", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), "users", VIEWER_UID)));
    await assertSucceeds(getDoc(doc(asTeacher(), "users", "teacher-colleague")));
    await assertSucceeds(getDocs(query(
      collection(asTeacher(), "users"),
      where(documentId(), "in", [VIEWER_UID, "teacher-colleague"]),
    )));
  });

  test("Teacher khong doc duoc ho so Admin", async () => {
    await assertFails(getDoc(doc(asTeacher(), "users", ADMIN_UID)));
  });

  test("Admin ghi academic settings hop le, moi tai khoan active duoc doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), "users", VIEWER_UID), {
      email: VIEWER_EMAIL,
      displayName: "Parent",
      photoURL: null,
      role: "viewer",
      studentIds: ["student_001"],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }));
    const academic = doc(asAdmin(), "settings", "academic");
    await assertSucceeds(setDoc(academic, {
      rankThresholds: { S: 90, A: 80, B: 65, D: 0 },
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(asTeacher(), "settings", "academic")));
    await assertSucceeds(getDoc(doc(asViewer(), "settings", "academic")));
    await assertFails(setDoc(doc(asTeacher(), "settings", "academic"), {
      rankThresholds: { S: 90, A: 80, B: 65, D: 0 },
      updatedAt: serverTimestamp(),
    }));
  });

  test("Tu choi academic settings sai thu tu", async () => {
    await assertFails(setDoc(doc(asAdmin(), "settings", "academic"), {
      rankThresholds: { S: 80, A: 90, B: 65, D: 0 },
      updatedAt: serverTimestamp(),
    }));
  });
});

describe("teacher scoped finance and assignment summaries", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, "students", "student_assigned"), { teacherIds: [TEACHER_UID] });
      await setDoc(doc(db, "students", "student_other"), { teacherIds: ["other-teacher"] });
      await setDoc(doc(db, "invoices", "invoice_assigned"), { studentId: "student_assigned", status: "unpaid", updatedAt: now });
      await setDoc(doc(db, "invoices", "invoice_other"), { studentId: "student_other", status: "unpaid", updatedAt: now });
      await setDoc(doc(db, "payments", "payment_assigned"), {
        invoiceId: "invoice_assigned", studentId: "student_assigned", amount: 100000,
        transactionReference: "REF-1", note: "", status: "reported", reportedBy: VIEWER_UID,
        verifiedBy: null, reportedAt: now, verifiedAt: null, updatedAt: now,
      });
      await setDoc(doc(db, "payments", "payment_other"), {
        invoiceId: "invoice_other", studentId: "student_other", amount: 100000,
        transactionReference: "REF-2", note: "", status: "reported", reportedBy: "other-parent",
        verifiedBy: null, reportedAt: now, verifiedAt: null, updatedAt: now,
      });
      await setDoc(doc(db, "classes", "class_assigned"), { teacherIds: [TEACHER_UID] });
      await setDoc(doc(db, "classes", "class_other"), { teacherIds: ["other-teacher"] });
      await setDoc(doc(db, "assignments", "assignment_assigned"), { classId: "class_assigned" });
      await setDoc(doc(db, "assignments", "assignment_other"), { classId: "class_other" });
      await setDoc(doc(db, "assignment_summaries", "assignment_assigned"), { assignmentId: "assignment_assigned" });
      await setDoc(doc(db, "assignment_summaries", "assignment_other"), { assignmentId: "assignment_other" });
    });
  });

  test("Teacher chi doc tai chinh hoc sinh duoc phan cong", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), "invoices", "invoice_assigned")));
    await assertFails(getDoc(doc(asTeacher(), "invoices", "invoice_other")));
    await assertSucceeds(getDoc(doc(asTeacher(), "payments", "payment_assigned")));
    await assertFails(getDoc(doc(asTeacher(), "payments", "payment_other")));
    await assertSucceeds(getDocs(query(collection(asTeacher(), "invoices"), where("studentId", "==", "student_assigned"))));
    await assertSucceeds(getDocs(query(collection(asTeacher(), "payments"), where("studentId", "==", "student_assigned"))));
    await assertFails(getDocs(collection(asTeacher(), "invoices")));
    await assertFails(getDocs(collection(asTeacher(), "payments")));
  });

  test("Teacher khong duoc doi soat, Admin van duoc xu ly", async () => {
    await assertFails(updateDoc(doc(asTeacher(), "invoices", "invoice_assigned"), { status: "paid", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(asTeacher(), "payments", "payment_assigned"), {
      status: "verified", verifiedBy: TEACHER_UID, verifiedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(asAdmin(), "invoices", "invoice_assigned"), { status: "paid", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(asAdmin(), "payments", "payment_assigned"), {
      status: "verified", verifiedBy: ADMIN_UID, verifiedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
  });

  test("Teacher chi doc assignment summary cua lop duoc phan cong", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), "assignment_summaries", "assignment_assigned")));
    await assertFails(getDoc(doc(asTeacher(), "assignment_summaries", "assignment_other")));
    await assertSucceeds(getDoc(doc(asAdmin(), "assignment_summaries", "assignment_other")));
  });
});

describe("notification read state", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "users", VIEWER_UID), {
        email: VIEWER_EMAIL,
        displayName: "Parent",
        photoURL: null,
        role: "viewer",
        studentIds: ["student_001"],
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await setDoc(doc(db, "announcements", "announcement_1"), {
        studentId: "student_001",
        title: "Thong bao",
      });
      await setDoc(doc(db, "announcements", "announcement_other"), {
        studentId: "student_999",
        title: "Thong bao khac",
      });
    });
  });

  test("viewer writes and reads own deterministic read state", async () => {
    const readRef = doc(asViewer(), "notification_reads", `${VIEWER_UID}_announcement_1`);
    await assertSucceeds(setDoc(readRef, {
      uid: VIEWER_UID,
      announcementId: "announcement_1",
      readAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(readRef));
  });

  test("viewer cannot forge uid, id, or announcement ownership", async () => {
    const validData = {
      uid: VIEWER_UID,
      announcementId: "announcement_1",
      readAt: serverTimestamp(),
    };
    await assertFails(setDoc(doc(asViewer(), "notification_reads", `other_announcement_1`), {
      ...validData,
      uid: "other",
    }));
    await assertFails(setDoc(doc(asViewer(), "notification_reads", "wrong-id"), validData));
    await assertFails(setDoc(doc(asViewer(), "notification_reads", `${VIEWER_UID}_announcement_other`), {
      ...validData,
      announcementId: "announcement_other",
    }));
  });

  test("other viewer cannot read state while admin can", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "notification_reads", `${VIEWER_UID}_announcement_1`), {
        uid: VIEWER_UID,
        announcementId: "announcement_1",
        readAt: Timestamp.now(),
      });
    });
    await assertFails(getDoc(doc(asViewer("other-viewer", "other@gmail.com"), "notification_reads", `${VIEWER_UID}_announcement_1`)));
    await assertSucceeds(getDoc(doc(asAdmin(), "notification_reads", `${VIEWER_UID}_announcement_1`)));
  });
});

describe("legacy client telemetry", () => {
  const usageId = `${TEACHER_UID}_2026-07-17_classes`;
  const activityId = `${VIEWER_UID}_2026-07-17`;

  test("client cannot create telemetry records", async () => {
    await assertFails(setDoc(doc(asTeacher(), "usage_events", usageId), { uid: TEACHER_UID }));
    await assertFails(setDoc(doc(asViewer(), "account_activity", activityId), { uid: VIEWER_UID }));
  });

  test("Admin can inspect legacy data while other roles cannot", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "usage_events", usageId), { uid: TEACHER_UID });
      await setDoc(doc(ctx.firestore(), "account_activity", activityId), { uid: VIEWER_UID });
    });
    await assertSucceeds(getDoc(doc(asAdmin(), "usage_events", usageId)));
    await assertSucceeds(getDoc(doc(asAdmin(), "account_activity", activityId)));
    await assertFails(getDoc(doc(asTeacher(), "usage_events", usageId)));
    await assertFails(getDoc(doc(asViewer(), "account_activity", activityId)));
  });
});

describe("Messenger referral secrets", () => {
  test("all client roles are denied nonce and PSID reverse-index access", async () => {
    const nonceRef = doc(asAdmin(), "messenger_link_nonces", "abcdefghijklmnopqrstuv");
    const psidRef = doc(asAdmin(), "messenger_psid_links", "psid-1");
    await assertFails(setDoc(nonceRef, { uid: VIEWER_UID, status: "active" }));
    await assertFails(getDoc(nonceRef));
    await assertFails(setDoc(psidRef, { uid: VIEWER_UID }));
    await assertFails(getDoc(psidRef));
  });
});
