import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { ClassDoc, EnrollmentDoc, StudentDoc } from "@/types/academic";

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
  // runTransaction (doc teacherIds ben trong transaction) thay vi getDoc roi
  // batch de tranh TOCTOU khi 2 thao tac ghi danh chay dong thoi.
  await runTransaction(db, async (transaction) => {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classSnap = await transaction.get(classRef);
    const teacherIds = classSnap.exists() ? (classSnap.data() as ClassDoc).teacherIds : [];
    const enrollRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId));

    transaction.set(enrollRef, {
      classId,
      courseId,
      studentId,
      status: "active",
      joinedAt: serverTimestamp(),
      endedAt: null,
    });
    transaction.update(classRef, {
      studentIds: arrayUnion(studentId),
      updatedAt: serverTimestamp(),
    });
    const studentUpdate: Record<string, unknown> = {
      currentClassIds: arrayUnion(classId),
      updatedAt: serverTimestamp(),
    };
    if (teacherIds.length > 0) studentUpdate.teacherIds = arrayUnion(...teacherIds);
    transaction.update(doc(db, COLLECTIONS.STUDENTS, studentId), studentUpdate);
  });
}

/**
 * Rut hoc sinh khoi lop - giu lai ban ghi enrollment (status=ended) thay vi xoa (A27).
 * Toan bo doc-tinh-ghi nam trong 1 runTransaction (nguon su that:
 * students.currentClassIds doc ben trong transaction) de tranh lost-update
 * teacherIds khi co thao tac ghi danh khac chay dong thoi.
 */
export async function unenrollStudent(classId: string, studentId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, COLLECTIONS.STUDENTS, studentId);
    const studentSnap = await transaction.get(studentRef);
    const currentClassIds = studentSnap.exists() ? (studentSnap.data() as StudentDoc).currentClassIds : [];
    const remainingClassIds = currentClassIds.filter((id) => id !== classId);
    const remainingClasses = await Promise.all(
      remainingClassIds.map((id) => transaction.get(doc(db, COLLECTIONS.CLASSES, id))),
    );
    const remainingTeacherIds = [...new Set(
      remainingClasses.flatMap((snap) => (snap.exists() ? (snap.data() as ClassDoc).teacherIds : [])),
    )];

    transaction.update(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId)), {
      status: "ended",
      endedAt: serverTimestamp(),
    });
    transaction.update(doc(db, COLLECTIONS.CLASSES, classId), {
      studentIds: arrayRemove(studentId),
      updatedAt: serverTimestamp(),
    });
    transaction.update(studentRef, {
      currentClassIds: arrayRemove(classId),
      teacherIds: remainingTeacherIds,
      updatedAt: serverTimestamp(),
    });
  });
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
