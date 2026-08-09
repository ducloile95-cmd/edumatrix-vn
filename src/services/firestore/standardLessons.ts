import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
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
  input: Partial<Omit<StandardLessonDoc, "approvalStatus" | "revision" | "createdBy" | "createdAt" | "updatedAt">>
): Promise<void> {
  const lessonRef = doc(db, COLLECTIONS.STANDARD_LESSONS, id);
  await runTransaction(db, async (transaction) => {
    const lessonSnap = await transaction.get(lessonRef);
    if (!lessonSnap.exists()) throw new Error("STANDARD_LESSON_NOT_FOUND");
    const lesson = lessonSnap.data() as StandardLessonDoc;
    if (lesson.approvalStatus !== "draft") throw new Error("STANDARD_LESSON_NOT_EDITABLE");
    transaction.update(lessonRef, {
      ...input,
      revision: lesson.revision + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

async function transitionStandardLesson(
  id: string,
  from: StandardLessonApprovalStatus[],
  approvalStatus: StandardLessonApprovalStatus,
): Promise<void> {
  const lessonRef = doc(db, COLLECTIONS.STANDARD_LESSONS, id);
  await runTransaction(db, async (transaction) => {
    const lessonSnap = await transaction.get(lessonRef);
    if (!lessonSnap.exists()) throw new Error("STANDARD_LESSON_NOT_FOUND");
    const lesson = lessonSnap.data() as StandardLessonDoc;
    if (!from.includes(lesson.approvalStatus)) throw new Error("STANDARD_LESSON_TRANSITION_INVALID");
    transaction.update(lessonRef, { approvalStatus, updatedAt: serverTimestamp() });
  });
}

export async function submitStandardLessonForApproval(id: string): Promise<void> {
  await transitionStandardLesson(id, ["draft"], "pending");
}

export async function approveStandardLesson(id: string): Promise<void> {
  await transitionStandardLesson(id, ["pending"], "approved");
}

export async function returnStandardLesson(id: string): Promise<void> {
  await transitionStandardLesson(id, ["pending"], "draft");
}

export async function archiveStandardLesson(id: string): Promise<void> {
  await transitionStandardLesson(id, ["approved"], "archived");
}

export async function listStandardLessons(
  filters: { subjectId?: string; approvalStatus?: StandardLessonApprovalStatus } = {},
  pageSize = 25,
  lastVisibleDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ lessons: (StandardLessonDoc & { id: string })[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
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

export async function listAllStandardLessons(
  filters: { subjectId?: string; approvalStatus?: StandardLessonApprovalStatus } = {},
  pageSize = 100,
): Promise<Array<StandardLessonDoc & { id: string }>> {
  const lessons: Array<StandardLessonDoc & { id: string }> = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
  do {
    const page = await listStandardLessons(filters, pageSize, cursor);
    lessons.push(...page.lessons);
    cursor = page.lastDoc ?? undefined;
    if (page.lessons.length < pageSize) break;
  } while (cursor);
  return lessons;
}
