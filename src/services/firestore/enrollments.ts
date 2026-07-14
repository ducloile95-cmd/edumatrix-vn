import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { ClassDoc, EnrollmentDoc } from "@/types/academic";

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
  const classSnap = await getDoc(doc(db, COLLECTIONS.CLASSES, classId));
  const teacherIds = classSnap.exists() ? (classSnap.data() as ClassDoc).teacherIds : [];
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
  const studentUpdate: Record<string, unknown> = {
    currentClassIds: arrayUnion(classId),
    updatedAt: serverTimestamp(),
  };
  if (teacherIds.length > 0) studentUpdate.teacherIds = arrayUnion(...teacherIds);
  batch.update(doc(db, COLLECTIONS.STUDENTS, studentId), studentUpdate);

  await batch.commit();
}

/** Rut hoc sinh khoi lop - giu lai ban ghi enrollment (status=ended) thay vi xoa (A27). */
export async function unenrollStudent(classId: string, studentId: string): Promise<void> {
  const activeEnrollments = await getDocs(
    query(
      collection(db, COLLECTIONS.ENROLLMENTS),
      where("studentId", "==", studentId),
      where("status", "==", "active"),
    ),
  );
  const remainingClassIds = activeEnrollments.docs
    .map((item) => (item.data() as EnrollmentDoc).classId)
    .filter((id) => id !== classId);
  const remainingClasses = await Promise.all(
    remainingClassIds.map(async (id) => {
      const classSnap = await getDoc(doc(db, COLLECTIONS.CLASSES, id));
      return classSnap.exists() ? (classSnap.data() as ClassDoc).teacherIds : [];
    }),
  );
  const remainingTeacherIds = [...new Set(remainingClasses.flat())];
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
    teacherIds: remainingTeacherIds,
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
