import {
  Timestamp,
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  startAfter,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { InvoiceBatchPartialError } from "@/services/firestore/invoiceErrors";
import { stableDocumentId } from "@/utils/idempotency";
import { createInvoiceCode, createPaymentContent } from "@/utils/payment";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { listStudents } from "@/services/firestore/students";
import { listQueryDocumentsPage } from "@/services/firestore/pagination";
import { queueUtilityDeliveryEvent } from "@/services/firestore/messengerDelivery";
import type { InvoiceDoc, InvoiceSourceType, PaymentDoc, PaymentStatus } from "@/types/academic";

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
  sourceType: InvoiceSourceType;
  sourceId: string;
  classId: string | null;
  subjectId: string | null;
  billingItemId: string | null;
  itemNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  /** So buoi da tinh tien truoc hoa don nay (hoa don lop) - tao ID tat dinh chong tao trung. */
  billedSessionsBefore?: number;
  /** So hoa don lop da co cua hoc sinh (ke ca da huy) - dua vao ID de lap lai sau khi huy khong trung ID. */
  priorClassInvoiceCount?: number;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<void> {
  await createInvoices([input]);
}

const INVOICES_PER_BATCH = 5;

/** Phát hành nhiều hóa đơn theo từng nhóm nguyên tử (xem INVOICES_PER_BATCH). */
export async function createInvoices(inputs: CreateInvoiceInput[]): Promise<void> {
  if (inputs.length === 0) return;
  // Moi hoa don kem mot event intent trong cung batch.
  if (inputs.length > 250) throw new Error("invoice_batch_limit");

  // shortcut: rules chi duoc doc ~20 document moi batch; nhom 5 hoa don (+5 event) da test o phase9.
  // Moi nhom la nguyen tu, khong phai ca lop. Tang khi Firestore noi gioi han truy cap.
  const createdStudentIds: string[] = [];
  for (let offset = 0; offset < inputs.length; offset += INVOICES_PER_BATCH) {
    const group = inputs.slice(offset, offset + INVOICES_PER_BATCH);
    const batch = writeBatch(db);
    group.forEach((input) => {
      const { actorUid, billedSessionsBefore, priorClassInvoiceCount, ...invoiceData } = input;
      // Hoa don lop: cung lop/hoc sinh/so buoi da tinh -> cung ID; rules khong cho ghi de (createdAt bat bien).
      const invoiceRef = input.sourceType === "class" && input.classId && billedSessionsBefore !== undefined
        ? doc(db, COLLECTIONS.INVOICES, stableDocumentId(["class", input.classId, input.studentId, String(billedSessionsBefore), String(input.quantity), String(priorClassInvoiceCount ?? 0)]))
        : doc(collection(db, COLLECTIONS.INVOICES));
      const invoiceCode = createInvoiceCode(input.studentId, invoiceRef.id);

      batch.set(invoiceRef, {
        ...invoiceData,
        invoiceCode,
        paymentContent: createPaymentContent(invoiceCode),
        dueAt: Timestamp.fromDate(input.dueAt),
        status: "unpaid",
        createdBy: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      queueUtilityDeliveryEvent(batch, {
        eventType: "invoice_committed",
        entityId: invoiceRef.id,
        sourceId: invoiceRef.id,
        studentId: input.studentId,
        version: 1,
        actorUid,
      });
    });
    try {
      await batch.commit();
    } catch (error) {
      if (createdStudentIds.length === 0) throw error;
      throw new InvoiceBatchPartialError(createdStudentIds, error);
    }
    createdStudentIds.push(...group.map((input) => input.studentId));
  }
}

async function listAllDocuments(collectionName: string, baseConstraints: QueryConstraint[], pageSize: number): Promise<QueryDocumentSnapshot<DocumentData, DocumentData>[]> {
  const documents: QueryDocumentSnapshot<DocumentData, DocumentData>[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData, DocumentData> | null = null;
  do {
    const snapshot: QuerySnapshot<DocumentData, DocumentData> = await getDocs(query(
      collection(db, collectionName),
      ...baseConstraints,
      orderBy(documentId()),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(pageSize),
    ));
    documents.push(...snapshot.docs);
    cursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null;
    if (snapshot.size < pageSize) break;
  } while (cursor);
  return documents;
}

export async function listInvoices(): Promise<(InvoiceDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const students = await listStudents();
    return listInvoicesByStudents(students.map((student) => student.id));
  }
  if (!isAdminUser(currentUser)) return [];
  const documents = await listAllDocuments(COLLECTIONS.INVOICES, [], 300);
  return documents.map((item) => ({ id: item.id, ...(item.data() as InvoiceDoc) }));
}

export async function listInvoicesByStudents(ids: string[], pageSize = 100): Promise<(InvoiceDoc & { id: string })[]> {
  const groups = await Promise.all(
    [...new Set(ids)].filter(Boolean).map(async (studentId) => {
      const documents = await listAllDocuments(
        COLLECTIONS.INVOICES,
        [where("studentId", "==", studentId)],
        pageSize,
      );
      return documents.map((item) => ({ id: item.id, ...(item.data() as InvoiceDoc) }));
    }),
  );

  return groups.flat();
}

export async function listInvoicePreviewsByStudents(ids: string[], maxPerStudent: number): Promise<(InvoiceDoc & { id: string })[]> {
  const groups = await Promise.all([...new Set(ids)].filter(Boolean).map(async (studentId) => {
    const documents = await listQueryDocumentsPage(
      COLLECTIONS.INVOICES,
      // Moi nhat truoc: lay N cu nhat roi loc "da tra" se giau hoa don chua tra moi sau khoang N hoa don.
      [where("studentId", "==", studentId), orderBy("dueAt", "desc")],
      maxPerStudent,
    );
    return documents.map((item) => ({ id: item.id, ...(item.data() as InvoiceDoc) }));
  }));
  return groups.flat().sort((a, b) => a.dueAt.toMillis() - b.dueAt.toMillis());
}

export async function reportPayment(
  invoice: InvoiceDoc & { id: string },
  uid: string,
  reference: string,
  note: string,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const invoiceRef = doc(db, COLLECTIONS.INVOICES, invoice.id);
    const paymentRef = doc(db, COLLECTIONS.PAYMENTS, stableDocumentId([invoice.id, uid]));
    const [invoiceSnap, paymentSnap] = await Promise.all([
      transaction.get(invoiceRef),
      transaction.get(paymentRef),
    ]);
    if (!invoiceSnap.exists()) throw new Error("INVOICE_NOT_FOUND");
    const currentInvoice = invoiceSnap.data() as InvoiceDoc;
    if (currentInvoice.status !== "unpaid" && currentInvoice.status !== "overdue" && currentInvoice.status !== "rejected") {
      throw new Error("INVOICE_NOT_REPORTABLE");
    }
    if (paymentSnap.exists()) {
      const currentPayment = paymentSnap.data() as PaymentDoc;
      if (currentPayment.status !== "rejected" || currentPayment.reportedBy !== uid) {
        throw new Error("PAYMENT_NOT_REPORTABLE");
      }
    }

    transaction.set(paymentRef, {
      invoiceId: invoice.id,
      studentId: currentInvoice.studentId,
      amount: currentInvoice.amount,
      transactionReference: reference,
      note,
      status: "reported",
      reportedBy: uid,
      verifiedBy: null,
      reportedAt: serverTimestamp(),
      verifiedAt: null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.update(invoiceRef, {
      status: "pending",
      updatedAt: serverTimestamp(),
    });
  });
}

export async function listPayments(): Promise<(PaymentDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const students = await listStudents();
    return listPaymentsByStudents(students.map((student) => student.id));
  }
  if (!isAdminUser(currentUser)) return [];
  const documents = await listAllDocuments(COLLECTIONS.PAYMENTS, [], 300);
  return documents.map((item) => ({ id: item.id, ...(item.data() as PaymentDoc) }));
}

export async function listPaymentsByStudents(ids: string[], pageSize = 100): Promise<(PaymentDoc & { id: string })[]> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const groups = await Promise.all(uniqueIds.map(async (studentId) => {
    const documents = await listAllDocuments(
      COLLECTIONS.PAYMENTS,
      [where("studentId", "==", studentId)],
      pageSize,
    );
    return documents.map((item) => ({ id: item.id, ...(item.data() as PaymentDoc) }));
  }));
  return groups.flat();
}

/** Huy han mot hoa don (Q5) - chi Admin (rules); khong tinh vao cong no, phu huynh khong nop chung tu duoc nua. */
export async function voidInvoice(invoiceId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.INVOICES, invoiceId), { status: "void", updatedAt: serverTimestamp() });
}

export async function reconcilePayment(
  payment: PaymentDoc & { id: string },
  status: Exclude<PaymentStatus, "reported">,
  uid: string,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const paymentRef = doc(db, COLLECTIONS.PAYMENTS, payment.id);
    const paymentSnap = await transaction.get(paymentRef);
    if (!paymentSnap.exists()) throw new Error("PAYMENT_NOT_FOUND");
    const currentPayment = paymentSnap.data() as PaymentDoc;
    if (currentPayment.status !== "reported") throw new Error("PAYMENT_ALREADY_RECONCILED");

    const invoiceRef = doc(db, COLLECTIONS.INVOICES, currentPayment.invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error("INVOICE_NOT_FOUND");
    const invoice = invoiceSnap.data() as InvoiceDoc;
    if (invoice.status !== "pending") throw new Error("INVOICE_NOT_PENDING");
    if (invoice.studentId !== currentPayment.studentId || invoice.amount !== currentPayment.amount) {
      throw new Error("PAYMENT_INVOICE_MISMATCH");
    }

    transaction.update(paymentRef, {
      status,
      verifiedBy: uid,
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(invoiceRef, {
      status: status === "verified" ? "paid" : "rejected",
      updatedAt: serverTimestamp(),
    });
    if (status === "verified") {
      queueUtilityDeliveryEvent(transaction, {
        eventType: "payment_verified",
        entityId: payment.id,
        sourceId: payment.id,
        studentId: currentPayment.studentId,
        version: 1,
        actorUid: uid,
      });
    }
  });
}
