import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { CourseDoc, CourseStatus } from "@/types/academic";

export interface CreateCourseInput {
  name: string;
  subjectIds: string[];
  tuitionFee: number;
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
    tuitionFee: input.tuitionFee,
    totalSessions: input.totalSessions,
    startDate: toTimestamp(input.startDate),
    endDate: toTimestamp(input.endDate),
    status: input.status,
    createdAt: serverTimestamp(),
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
