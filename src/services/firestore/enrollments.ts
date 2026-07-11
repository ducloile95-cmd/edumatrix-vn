import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { EnrollmentDoc } from "@/types/academic";

/** ID = {classId}_{studentId} chong ghi trung (A13). */
function enrollmentId(classId: string, studentId: string): string {
  return `${classId}_${studentId}`;
}

/**
 * Ghi danh hoc sinh vao lop - batch 3 thao tac de dam bao nhat quan (A5
 * buoc 3): enrollments/{id}, classes/{classId}.studentIds,
 * students/{studentId}.currentClassIds.
 */
export async function enrollStudent(classId: string, courseId: string, studentId: string): Promise<void> {
  const batch = writeBatch(db);
  const enrollRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId));

  batch.set(enrollRef, {
    classId,
    courseId,
    studentId,
    status: "active",
    joinedAt: serverTimestamp(),
    endedAt: null,
  });
  batch.update(doc(db, COLLECTIONS.CLASSES, classId), {
    studentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, COLLECTIONS.STUDENTS, studentId), {
    currentClassIds: arrayUnion(classId),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/** Rut hoc sinh khoi lop - giu lai ban ghi enrollment (status=ended) thay vi xoa (A27). */
export async function unenrollStudent(classId: string, studentId: string): Promise<void> {
  const batch = writeBatch(db);
  const enrollRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId));

  batch.update(enrollRef, {
    status: "ended",
    endedAt: serverTimestamp(),
  });
  batch.update(doc(db, COLLECTIONS.CLASSES, classId), {
    studentIds: arrayRemove(studentId),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, COLLECTIONS.STUDENTS, studentId), {
    currentClassIds: arrayRemove(classId),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Ghi danh dang active cua 1 lop. Khong dung orderBy tren field khac de
 * tranh phai tao composite index (A14) - sap xep o client vi so luong nho.
 */
export async function listActiveEnrollmentsByClass(classId: string): Promise<EnrollmentDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where("classId", "==", classId),
    where("status", "==", "active"),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as EnrollmentDoc)
    .sort((a, b) => b.joinedAt.toMillis() - a.joinedAt.toMillis());
}
