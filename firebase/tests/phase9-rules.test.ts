import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
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

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "phase9-rules",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: 8090,
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
    await setDoc(doc(db, "invoices", "invoice-1"), invoice);
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

  test("viewer reports payment", async () =>
    assertSucceeds(
      setDoc(doc(env.authenticatedContext("viewer").firestore(), "payments", "new"), {
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

    await assertSucceeds(
      setDoc(
        doc(env.authenticatedContext("viewer").firestore(), "payments", "payment-1"),
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
      ),
    );
  });

  test("staff verifies payment", async () =>
    assertSucceeds(
      updateDoc(doc(env.authenticatedContext("admin").firestore(), "payments", "payment-1"), {
        status: "verified",
        verifiedBy: "admin",
      }),
    ));
});
