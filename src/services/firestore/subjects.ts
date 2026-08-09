import {
  doc,
  orderBy,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { SubjectDoc, SubjectStatus } from "@/types/academic";
import { listAllQueryDocuments } from "@/services/firestore/pagination";

export interface CreateSubjectInput {
  name: string;
  code: string;
  description: string;
}

/** ID = ma mon hoc chuan hoa (A13) - khong query kiem tra ton tai truoc. */
function subjectId(code: string): string {
  return code.trim().toUpperCase();
}

export async function createSubject(input: CreateSubjectInput): Promise<void> {
  const id = subjectId(input.code);
  const ref = doc(db, COLLECTIONS.SUBJECTS, id);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) throw new Error("SUBJECT_CODE_EXISTS");
    transaction.set(ref, {
      name: input.name,
      code: id,
      description: input.description,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export interface UpdateSubjectInput {
  name: string;
  description: string;
}

/**
 * Sua mon hoc - CHI sua name/description, khong cho doi code vi code chinh la
 * document ID (A13) da duoc CourseDoc.subjectIds/ClassDoc.subjectIds tham chieu toi;
 * doi code se can migrate ID rieng, ngoai pham vi ban sua nay.
 */
export async function updateSubject(subjectDocId: string, input: UpdateSubjectInput): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SUBJECTS, subjectDocId), {
    name: input.name,
    description: input.description,
    updatedAt: serverTimestamp(),
  });
}

export async function setSubjectStatus(subjectDocId: string, status: SubjectStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SUBJECTS, subjectDocId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function listSubjects(): Promise<(SubjectDoc & { id: string })[]> {
  const documents = await listAllQueryDocuments(
    COLLECTIONS.SUBJECTS,
    [orderBy("name")],
    200,
  );
  return documents.map((d) => ({ id: d.id, ...(d.data() as SubjectDoc) }));
}
