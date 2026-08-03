import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import type { BillingItemDoc, BillingItemStatus } from "@/types/academic";

export interface UpsertBillingItemInput {
  name: string;
  courseId: string;
  subjectId: string;
  unitPrice: number;
  status: BillingItemStatus;
}

export async function createBillingItem(input: UpsertBillingItemInput): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.BILLING_ITEMS), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBillingItem(id: string, input: UpsertBillingItemInput): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.BILLING_ITEMS, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function setBillingItemStatus(id: string, status: BillingItemStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.BILLING_ITEMS, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function listBillingItems(): Promise<(BillingItemDoc & { id: string })[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.BILLING_ITEMS), orderBy("name"), limit(200)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as BillingItemDoc) }));
}
