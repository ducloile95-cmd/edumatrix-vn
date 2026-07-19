import {
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  getCountFromServer,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { stableDocumentId } from "@/utils/idempotency";
import { createInvoiceCode, createPaymentContent } from "@/utils/payment";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { listStudents } from "@/services/firestore/students";
import type { InvoiceDoc, PaymentDoc, PaymentStatus } from "@/types/academic";

export interface CreateInvoiceInput {
  studentId: string;
  courseId: string | null;
  title: string;
  amount: number;
  dueAt: Date;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  actorUid: string;
}

export interface InvoicePage {
  items: (InvoiceDoc & { id: string })[];
  nextCursor: QueryDocumentSnapshot | undefined;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<void> {
  const invoiceRef = doc(collection(db, COLLECTIONS.INVOICES));
  const invoiceCode = createInvoiceCode(input.studentId, invoiceRef.id);

  await setDoc(invoiceRef, {
    ...input,
    invoiceCode,
    paymentContent: createPaymentContent(invoiceCode),
    dueAt: Timestamp.fromDate(input.dueAt),
    status: "unpaid",
    createdBy: input.actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listInvoices(): Promise<(InvoiceDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const students = await listStudents();
    return listInvoicesByStudents(students.map((student) => student.id));
  }
  if (!isAdminUser(currentUser)) return [];
  const snap = await getDocs(query(collection(db, COLLECTIONS.INVOICES), limit(300)));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as InvoiceDoc) }));
}

export async function countPendingInvoices(): Promise<number> {
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const invoices = await listInvoices();
    return invoices.filter((invoice) => invoice.status === "pending").length;
  }
  if (!isAdminUser(currentUser)) return 0;
  const snapshot = await getCountFromServer(
    query(collection(db, COLLECTIONS.INVOICES), where("status", "==", "pending")),
  );
  return snapshot.data().count;
}

export async function listInvoicesPage(pageSize = 50, cursor?: QueryDocumentSnapshot): Promise<InvoicePage> {
  const constraints = cursor
    ? [orderBy("createdAt", "desc"), startAfter(cursor), limit(pageSize)]
    : [orderBy("createdAt", "desc"), limit(pageSize)];
  const snap = await getDocs(query(collection(db, COLLECTIONS.INVOICES), ...constraints));

  return {
    items: snap.docs.map((item) => ({ id: item.id, ...(item.data() as InvoiceDoc) })),
    nextCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined,
  };
}

export async function listInvoicesByStudents(ids: string[], pageSize = 100): Promise<(InvoiceDoc & { id: string })[]> {
  const groups = await Promise.all(
    ids.map(async (studentId) => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.INVOICES), where("studentId", "==", studentId), limit(pageSize)),
      );
      return snap.docs.map((item) => ({ id: item.id, ...(item.data() as InvoiceDoc) }));
    }),
  );

  return groups.flat();
}

export async function reportPayment(
  invoice: InvoiceDoc & { id: string },
  uid: string,
  reference: string,
  note: string,
): Promise<void> {
  const batch = writeBatch(db);
  const payment = doc(db, COLLECTIONS.PAYMENTS, stableDocumentId([invoice.id, uid]));

  batch.set(
    payment,
    {
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      amount: invoice.amount,
      transactionReference: reference,
      note,
      status: "reported",
      reportedBy: uid,
      verifiedBy: null,
      reportedAt: serverTimestamp(),
      verifiedAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.update(doc(db, COLLECTIONS.INVOICES, invoice.id), {
    status: "pending",
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function listPayments(): Promise<(PaymentDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const students = await listStudents();
    return listPaymentsByStudents(students.map((student) => student.id));
  }
  if (!isAdminUser(currentUser)) return [];
  const snap = await getDocs(query(collection(db, COLLECTIONS.PAYMENTS), limit(300)));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as PaymentDoc) }));
}

export async function listPaymentsByStudents(ids: string[], pageSize = 100): Promise<(PaymentDoc & { id: string })[]> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const groups = await Promise.all(uniqueIds.map(async (studentId) => {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.PAYMENTS), where("studentId", "==", studentId), limit(pageSize)),
    );
    return snap.docs.map((item) => ({ id: item.id, ...(item.data() as PaymentDoc) }));
  }));
  return groups.flat();
}

export async function reconcilePayment(
  payment: PaymentDoc & { id: string },
  status: Exclude<PaymentStatus, "reported">,
  uid: string,
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, COLLECTIONS.PAYMENTS, payment.id), {
    status,
    verifiedBy: uid,
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, COLLECTIONS.INVOICES, payment.invoiceId), {
    status: status === "verified" ? "paid" : "rejected",
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
