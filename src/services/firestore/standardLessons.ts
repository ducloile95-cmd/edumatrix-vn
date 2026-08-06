import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { StandardLessonDoc, StandardLessonApprovalStatus } from "@/types/academic";

export async function createStandardLesson(
  input: Omit<StandardLessonDoc, "approvalStatus" | "revision" | "createdBy" | "createdAt" | "updatedAt">,
  createdBy: string
): Promise<string> {
  const lessonRef = collection(db, COLLECTIONS.STANDARD_LESSONS);
  const newLesson: StandardLessonDoc = {
    ...input,
    approvalStatus: "draft",
    revision: 1,
    createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(lessonRef, {
    ...newLesson,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getStandardLesson(id: string): Promise<(StandardLessonDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.STANDARD_LESSONS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as StandardLessonDoc) };
}

export async function updateStandardLesson(
  id: string,
  input: Partial<Omit<StandardLessonDoc, "createdBy" | "createdAt" | "updatedAt">>
): Promise<void> {
  const lessonRef = doc(db, COLLECTIONS.STANDARD_LESSONS, id);
  await updateDoc(lessonRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function submitStandardLessonForApproval(id: string): Promise<void> {
  await updateStandardLesson(id, { approvalStatus: "pending" });
}

export async function approveStandardLesson(id: string): Promise<void> {
  await updateStandardLesson(id, { approvalStatus: "approved" });
}

export async function returnStandardLesson(id: string): Promise<void> {
  await updateStandardLesson(id, { approvalStatus: "draft" });
}

export async function archiveStandardLesson(id: string): Promise<void> {
  await updateStandardLesson(id, { approvalStatus: "archived" });
}

export async function listStandardLessons(
  filters: { subjectId?: string; approvalStatus?: StandardLessonApprovalStatus } = {},
  pageSize = 25,
  lastVisibleDoc?: any
): Promise<{ lessons: (StandardLessonDoc & { id: string })[]; lastDoc: any }> {
  let q = query(
    collection(db, COLLECTIONS.STANDARD_LESSONS),
    orderBy("updatedAt", "desc")
  );

  if (filters.subjectId) {
    q = query(q, where("subjectId", "==", filters.subjectId));
  }
  if (filters.approvalStatus) {
    q = query(q, where("approvalStatus", "==", filters.approvalStatus));
  }
  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }
  q = query(q, limit(pageSize));

  const snapshot = await getDocs(q);
  const lessons = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as StandardLessonDoc),
  }));

  return {
    lessons,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
  };
}
