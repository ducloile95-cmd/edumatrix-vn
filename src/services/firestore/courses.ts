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
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { CourseDoc, CourseStatus } from "@/types/academic";

export interface CreateCourseInput {
  name: string;
  subjectIds: string[];
  /** Don gia 1 buoi/1 hoc sinh - VND. */
  pricePerSession: number;
  totalSessions: number;
  /** "YYYY-MM-DD" tu input type=date. */
  startDate: string;
  endDate: string;
  status: CourseStatus;
}

function toTimestamp(dateStr: string): Timestamp {
  return Timestamp.fromDate(new Date(`${dateStr}T00:00:00`));
}

/** ID auto - khong co ma khoa hoc nghiep vu rieng (A13). */
export async function createCourse(input: CreateCourseInput): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.COURSES), {
    name: input.name,
    subjectIds: input.subjectIds,
    pricePerSession: input.pricePerSession,
    tuitionFee: input.pricePerSession * input.totalSessions,
    totalSessions: input.totalSessions,
    startDate: toTimestamp(input.startDate),
    endDate: toTimestamp(input.endDate),
    status: input.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Sua khoa hoc - giu nguyen ID, khong dong subjectIds cua ClassDoc (Lop hoc tu chon rieng). */
export async function updateCourse(courseId: string, input: CreateCourseInput): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), {
    name: input.name,
    subjectIds: input.subjectIds,
    pricePerSession: input.pricePerSession,
    tuitionFee: input.pricePerSession * input.totalSessions,
    totalSessions: input.totalSessions,
    startDate: toTimestamp(input.startDate),
    endDate: toTimestamp(input.endDate),
    status: input.status,
    updatedAt: serverTimestamp(),
  });
}

export async function setCourseStatus(courseId: string, status: CourseStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Danh muc khoa hoc - nho, khong can pagination that su (A14). */
export async function listCourses(): Promise<(CourseDoc & { id: string })[]> {
  const q = query(collection(db, COLLECTIONS.COURSES), orderBy("name"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CourseDoc) }));
}

export async function getCourse(courseId: string): Promise<(CourseDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.COURSES, courseId));
  return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as CourseDoc) } : null;
}
