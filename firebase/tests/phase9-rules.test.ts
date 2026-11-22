import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let env: RulesTestEnvironment;

const invoice = {
  invoiceCode: "HP-HS1-202607",
  studentId: "student-1",
  courseId: null,
  title: "Hoc phi",
  amount: 1000000,
  dueAt: Timestamp.now(),
  paymentContent: "HP HS1 202607",
  bankBin: "970436",
  accountNumber: "123",
  accountName: "EDU",
  status: "unpaid",
  createdBy: "admin",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const billingItem = {
  name: "Giao trinh English Foundation",
  courseId: "course-1",
  subjectId: "subject-1",
  unitPrice: 250000,
  status: "active",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const billingItemInvoice = {
  ...invoice,
  courseId: "course-1",
  title: "Do dung hoc tap: Giao trinh English Foundation",
  amount: 250000,
  sourceType: "billing_item",
  sourceId: "item-1",
  classId: "class-1",
  subjectId: "subject-1",
  billingItemId: "item-1",
  itemNameSnapshot: "Giao trinh English Foundation",
  unitPriceSnapshot: 250000,
  quantity: 1,
};

const classInvoice = {
  ...invoice,
  courseId: "course-1",
  title: "Hoc phi lop",
  amount: 300000,
  sourceType: "class",
  sourceId: "class-1",
  classId: "class-1",
  subjectId: null,
  billingItemId: null,
  itemNameSnapshot: "English Foundation",
  unitPriceSnapshot: 100000,
  quantity: 3,
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "phase9-rules",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8091),
    },
  });
});

afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", "admin"), {
      role: "admin",
      status: "active",
      studentIds: [],
    });
    await setDoc(doc(db, "users", "viewer"), {
      role: "viewer",
      status: "active",
      studentIds: ["student-1"],
    });
    await setDoc(doc(db, "users", "other"), {
      role: "viewer",
      status: "active",
      studentIds: ["student-2"],
    });
    await setDoc(doc(db, "users", "teacher"), {
      role: "teacher",
      status: "active",
      studentIds: [],
    });
    await setDoc(doc(db, "subjects", "subject-1"), { name: "English", code: "subject-1", status: "active" });
    await setDoc(doc(db, "subjects", "subject-2"), { name: "Math", code: "subject-2", status: "active" });
    await setDoc(doc(db, "settings", "payment"), {
      bankBin: "970436", bankName: "Vietcombank", accountNumber: "123", accountName: "EDU",
      contentTemplate: "{invoiceCode}", vietQrTemplate: "compact2", updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "courses", "course-1"), {
      subjectIds: ["subject-1"], teacherIds: ["teacher"], pricePerSession: 100000, tuitionFee: 1000000, totalSessions: 10,
    });
    await setDoc(doc(db, "courses", "course-legacy"), {
      subjectIds: ["subject-1"], teacherIds: ["teacher"], tuitionFee: 1000000, totalSessions: 3,
    });
    await setDoc(doc(db, "classes", "class-legacy"), { courseId: "course-legacy", subjectIds: ["subject-1"], studentIds: ["student-1"], teacherIds: ["teacher"], status: "active" });
    await setDoc(doc(db, "students", "student-1"), { studentCode: "student-1", teacherIds: ["teacher"] });
    await setDoc(doc(db, "students", "student-2"), { studentCode: "student-2", teacherIds: [] });
    await setDoc(doc(db, "classes", "class-1"), { courseId: "course-1", subjectIds: ["subject-1"], studentIds: ["student-1"], teacherIds: ["teacher"], status: "active" });
    await setDoc(doc(db, "billing_items", "item-1"), billingItem);
    await setDoc(doc(db, "invoices", "invoice-1"), invoice);
    await setDoc(doc(db, "invoices", "invoice-other"), {
      ...invoice,
      invoiceCode: "HP-HS2-202607",
      studentId: "student-2",
    });
    await setDoc(doc(db, "payments", "payment-1"), {
      invoiceId: "invoice-1",
      studentId: "student-1",
      amount: 1000000,
      transactionReference: "TX",
      note: "",
      status: "reported",
      reportedBy: "viewer",
      verifiedBy: null,
      reportedAt: Timestamp.now(),
      verifiedAt: null,
      updatedAt: Timestamp.now(),
    });
  });
});

describe("Phase 9 payment", () => {
  test("admin creates invoice", async () =>
    assertSucceeds(
      setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-new"), {
        ...invoice,
        createdBy: "admin",
      }),
    ));

  test("teacher cannot create an unscoped invoice", async () =>
    assertFails(
      setDoc(doc(env.authenticatedContext("teacher").firestore(), "invoices", "invoice-new"), {
        ...invoice,
        createdBy: "teacher",
      }),
    ));

  test("teacher creates an invoice for an assigned class", async () =>
    assertSucceeds(
      setDoc(doc(env.authenticatedContext("teacher").firestore(), "invoices", "invoice-teacher"), {
        ...billingItemInvoice,
        createdBy: "teacher",
      }),
    ));

  test("teacher cannot create an invoice for a student outside the assigned class", async () =>
    assertFails(
      setDoc(doc(env.authenticatedContext("teacher").firestore(), "invoices", "invoice-cross-class"), {
        ...billingItemInvoice,
        studentId: "student-2",
        createdBy: "teacher",
      }),
    ));

  test("owner reads invoice", async () =>
    assertSucceeds(getDoc(doc(env.authenticatedContext("viewer").firestore(), "invoices", "invoice-1"))));

  test("other viewer denied", async () =>
    assertFails(getDoc(doc(env.authenticatedContext("other").firestore(), "invoices", "invoice-1"))));

  test("viewer can report pending", async () =>
    assertSucceeds(
      updateDoc(doc(env.authenticatedContext("viewer").firestore(), "invoices", "invoice-1"), {
        status: "pending",
        updatedAt: Timestamp.now(),
      }),
    ));

  test("viewer cannot self mark paid", async () =>
    assertFails(
      updateDoc(doc(env.authenticatedContext("viewer").firestore(), "invoices", "invoice-1"), {
        status: "paid",
        updatedAt: Timestamp.now(),
      }),
    ));

  test("viewer reports payment and moves its invoice to pending atomically", async () => {
    const db = env.authenticatedContext("viewer").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "payments", "new"), {
      invoiceId: "invoice-1",
      studentId: "student-1",
      amount: 1000000,
      transactionReference: "",
      note: "",
      status: "reported",
      reportedBy: "viewer",
      verifiedBy: null,
      reportedAt: Timestamp.now(),
      verifiedAt: null,
      updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, "invoices", "invoice-1"), {
      status: "pending",
      updatedAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());
  });

  test("viewer cannot create a standalone payment without moving its invoice to pending", async () =>
    assertFails(
      setDoc(doc(env.authenticatedContext("viewer").firestore(), "payments", "standalone"), {
        invoiceId: "invoice-1",
        studentId: "student-1",
        amount: 1000000,
        transactionReference: "",
        note: "",
        status: "reported",
        reportedBy: "viewer",
        verifiedBy: null,
        reportedAt: Timestamp.now(),
        verifiedAt: null,
        updatedAt: Timestamp.now(),
      }),
    ));

  test("viewer reports an overdue invoice atomically", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "invoices", "invoice-1"), {
        status: "overdue",
        updatedAt: Timestamp.now(),
      });
    });
    const db = env.authenticatedContext("viewer").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "payments", "overdue"), {
      invoiceId: "invoice-1",
      studentId: "student-1",
      amount: 1000000,
      transactionReference: "TX-OVERDUE",
      note: "",
      status: "reported",
      reportedBy: "viewer",
      verifiedBy: null,
      reportedAt: Timestamp.now(),
      verifiedAt: null,
      updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, "invoices", "invoice-1"), {
      status: "pending",
      updatedAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());
  });

  test("viewer cannot report payment against another student's invoice", async () =>
    assertFails(
      setDoc(doc(env.authenticatedContext("viewer").firestore(), "payments", "cross"), {
        invoiceId: "invoice-other",
        studentId: "student-1",
        amount: 1000000,
        transactionReference: "",
        note: "",
        status: "reported",
        reportedBy: "viewer",
        verifiedBy: null,
        reportedAt: Timestamp.now(),
        verifiedAt: null,
        updatedAt: Timestamp.now(),
      }),
    ));

  test("viewer cannot spoof payment reporter", async () =>
    assertFails(
      setDoc(doc(env.authenticatedContext("viewer").firestore(), "payments", "spoof"), {
        invoiceId: "invoice-1",
        studentId: "student-1",
        amount: 1000000,
        transactionReference: "",
        note: "",
        status: "reported",
        reportedBy: "other",
        verifiedBy: null,
        reportedAt: Timestamp.now(),
        verifiedAt: null,
        updatedAt: Timestamp.now(),
      }),
    ));

  test("viewer retries rejected payment", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "payments", "payment-1"), {
        status: "rejected",
        verifiedBy: "admin",
        verifiedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await updateDoc(doc(ctx.firestore(), "invoices", "invoice-1"), {
        status: "rejected",
        updatedAt: Timestamp.now(),
      });
    });

    const db = env.authenticatedContext("viewer").firestore();
    const batch = writeBatch(db);
    batch.set(
      doc(db, "payments", "payment-1"),
      {
        invoiceId: "invoice-1",
        studentId: "student-1",
        amount: 1000000,
        transactionReference: "TX2",
        note: "retry",
        status: "reported",
        reportedBy: "viewer",
        verifiedBy: null,
        reportedAt: Timestamp.now(),
        verifiedAt: null,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    batch.update(doc(db, "invoices", "invoice-1"), {
      status: "pending",
      updatedAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());
  });

  test("staff verifies payment and its invoice atomically", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "invoices", "invoice-1"), { status: "pending" });
    });
    const db = env.authenticatedContext("admin").firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, "payments", "payment-1"), {
      status: "verified", verifiedBy: "admin", verifiedAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, "invoices", "invoice-1"), { status: "paid", updatedAt: Timestamp.now() });
    await assertSucceeds(batch.commit());
  });

  test("assigned teacher verifies payment and its invoice atomically", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "invoices", "invoice-1"), { status: "pending" });
    });
    const db = env.authenticatedContext("teacher").firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, "payments", "payment-1"), {
      status: "verified", verifiedBy: "teacher", verifiedAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, "invoices", "invoice-1"), { status: "paid", updatedAt: Timestamp.now() });
    await assertSucceeds(batch.commit());
  });
});

describe("Invoice integrity (A1)", () => {
  const asTeacherDb = () => env.authenticatedContext("teacher").firestore();
  const asAdminDb = () => env.authenticatedContext("admin").firestore();

  test("teacher cannot create a manual invoice without sourceType", async () =>
    assertFails(setDoc(doc(asTeacherDb(), "invoices", "manual"), { ...invoice, classId: "class-1", createdBy: "teacher" })));

  test("teacher creates a class invoice priced from the course", async () =>
    assertSucceeds(setDoc(doc(asTeacherDb(), "invoices", "class-ok"), { ...classInvoice, createdBy: "teacher" })));

  test("nobody can set a custom unit price on a class invoice", async () =>
    assertFails(setDoc(doc(asAdminDb(), "invoices", "class-price"), {
      ...classInvoice, unitPriceSnapshot: 90000, amount: 270000,
    })));

  test("legacy course price falls back to round(tuitionFee / totalSessions)", async () =>
    assertSucceeds(setDoc(doc(asAdminDb(), "invoices", "class-legacy"), {
      ...classInvoice, courseId: "course-legacy", sourceId: "class-legacy", classId: "class-legacy",
      unitPriceSnapshot: 333333, amount: 999999,
    })));

  test("nobody can send payment to another bank account", async () => {
    await assertFails(setDoc(doc(asAdminDb(), "invoices", "bank-admin"), { ...invoice, accountNumber: "999" }));
    await assertFails(setDoc(doc(asTeacherDb(), "invoices", "bank-teacher"), { ...billingItemInvoice, accountName: "TEACHER", createdBy: "teacher" }));
  });

  test("invoice creation fails when payment settings are missing", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await deleteDoc(doc(ctx.firestore(), "settings", "payment")); });
    await assertFails(setDoc(doc(asAdminDb(), "invoices", "no-settings"), invoice));
  });

  test("admin creates a chunk of 5 class invoices in one batch", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const ids = Array.from({ length: 5 }, (_, i) => `bulk-${i}`);
      await Promise.all(ids.map((id) => setDoc(doc(ctx.firestore(), "students", id), { studentCode: id, teacherIds: ["teacher"] })));
      await updateDoc(doc(ctx.firestore(), "classes", "class-1"), { studentIds: ["student-1", ...ids] });
    });
    const db = asAdminDb();
    const batch = writeBatch(db);
    // Giong createInvoices: moi hoa don kem mot delivery event trong cung batch.
    Array.from({ length: 5 }, (_, i) => {
      const invoiceId = `bulk-inv-${i}`;
      batch.set(doc(db, "invoices", invoiceId), { ...classInvoice, studentId: `bulk-${i}` });
      const eventId = `invoice_committed:${invoiceId}:v1`;
      batch.set(doc(db, "messenger_delivery_events", eventId), {
        eventType: "invoice_committed", entityId: invoiceId, sourceId: invoiceId, studentId: `bulk-${i}`, version: 1,
        actorUid: "admin", idempotencyKey: eventId, status: "pending", attempts: 0, lastErrorCode: null, leaseUntil: null,
        nextAttemptAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    });
    await assertSucceeds(batch.commit());
  });
});

describe("Billing item integrity", () => {
  test("admin manages a billing item linked to the selected course subject", async () =>
    assertSucceeds(setDoc(doc(env.authenticatedContext("admin").firestore(), "billing_items", "item-new"), billingItem)));

  test("teacher cannot create a billing item", async () =>
    assertFails(setDoc(doc(env.authenticatedContext("teacher").firestore(), "billing_items", "item-new"), billingItem)));

  test("rejects a billing item whose subject is outside the course", async () =>
    assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "billing_items", "item-new"), {
      ...billingItem,
      subjectId: "subject-2",
    })));

  test("creates an invoice with an immutable billing-item snapshot", async () =>
    assertSucceeds(setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-item"), {
      ...billingItemInvoice,
    })));

  test("rejects a billing-item invoice for a student outside the eligible class", async () =>
    assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-wrong-student"), {
      ...billingItemInvoice,
      studentId: "student-2",
    })));

  test("rejects an invoice for an archived billing item", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "billing_items", "item-1"), { status: "archived" });
    });
    await assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-archived-item"), billingItemInvoice));
  });

  test("rejects a billing-item invoice backed by an inactive class", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "classes", "class-1"), { status: "completed" });
    });
    await assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-inactive-class"), billingItemInvoice));
  });

  test("rejects a billing-item invoice when the class does not teach the item subject", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "classes", "class-1"), { subjectIds: ["subject-2"] });
    });
    await assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-wrong-subject"), billingItemInvoice));
  });

  test("rejects an invoice for a missing course", async () =>
    assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-orphan"), {
      ...invoice,
      courseId: "missing-course",
    })));

  test("rejects an invoice for a missing student", async () =>
    assertFails(setDoc(doc(env.authenticatedContext("admin").firestore(), "invoices", "invoice-missing-student"), {
      ...invoice,
      studentId: "missing-student",
    })));
});
