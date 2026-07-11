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
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { ClassDoc, ClassStatus } from "@/types/academic";

export interface UpsertClassInput {
  name: string;
  courseId: string;
  subjectIds: string[];
  teacherIds: string[];
  scheduleText: string;
  location: string;
  status: ClassStatus;
}

/** ID auto - khong co ma lop nghiep vu rieng (A13). */
export async function createClass(input: UpsertClassInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.CLASSES), {
    name: input.name,
    courseId: input.courseId,
    subjectIds: input.subjectIds,
    teacherIds: input.teacherIds,
    studentIds: [],
    scheduleText: input.scheduleText,
    location: input.location,
    status: input.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Khong dong studentIds tai day - viec ghi danh di qua services/firestore/enrollments.ts. */
export async function updateClass(classId: string, input: UpsertClassInput): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CLASSES, classId), {
    name: input.name,
    courseId: input.courseId,
    subjectIds: input.subjectIds,
    teacherIds: input.teacherIds,
    scheduleText: input.scheduleText,
    location: input.location,
    status: input.status,
    updatedAt: serverTimestamp(),
  });
}

/** Danh sach lop - danh muc nho, khong can pagination that su (A14). */
export async function listClasses(): Promise<(ClassDoc & { id: string })[]> {
  const q = query(collection(db, COLLECTIONS.CLASSES), orderBy("name"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ClassDoc) }));
}

export async function getClass(classId: string): Promise<(ClassDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CLASSES, classId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as ClassDoc) };
}
