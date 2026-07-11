import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { SubjectDoc, SubjectStatus } from "@/types/academic";

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
  await setDoc(doc(db, COLLECTIONS.SUBJECTS, id), {
    name: input.name,
    code: id,
    description: input.description,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setSubjectStatus(subjectDocId: string, status: SubjectStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SUBJECTS, subjectDocId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Danh muc mon hoc - nho (du an quy mo <50 tai khoan), khong can pagination that su (A14). */
export async function listSubjects(): Promise<(SubjectDoc & { id: string })[]> {
  const q = query(collection(db, COLLECTIONS.SUBJECTS), orderBy("name"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubjectDoc) }));
}
