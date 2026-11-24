import {
  arrayRemove,
  arrayUnion,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { queueUtilityDeliveryEvent } from "@/services/firestore/messengerDelivery";
import type { ClassDoc, StudentDoc } from "@/types/academic";

/** ID = {classId}_{studentId} chong ghi trung (A13). */
function enrollmentId(classId: string, studentId: string): string {
  return `${classId}_${studentId}`;
}

/**
 * Ghi danh hoc sinh vao lop - batch 3 thao tac de dam bao nhat quan (A5
 * buoc 3): enrollments/{id}, classes/{classId}.studentIds,
 * students/{studentId}.currentClassIds.
 */
export async function enrollStudent(classId: string, studentId: string, actorUid: string): Promise<void> {
  // runTransaction (doc teacherIds ben trong transaction) thay vi getDoc roi
  // batch de tranh TOCTOU khi 2 thao tac ghi danh chay dong thoi.
  await runTransaction(db, async (transaction) => {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const studentRef = doc(db, COLLECTIONS.STUDENTS, studentId);
    const enrollRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId));
    const [classSnap, studentSnap, enrollmentSnap] = await Promise.all([
      transaction.get(classRef),
      transaction.get(studentRef),
      transaction.get(enrollRef),
    ]);
    if (!classSnap.exists()) throw new Error("class_not_found");
    if (!studentSnap.exists()) throw new Error("student_not_found");
    const klass = classSnap.data() as ClassDoc;
    const student = studentSnap.data() as StudentDoc;
    if (klass.status !== "active") throw new Error("class_not_active");
    if (student.status !== "active") throw new Error("student_not_active");
    const teacherIds = klass.teacherIds;
    const existingEnrollment = enrollmentSnap.exists() ? enrollmentSnap.data() : null;
    const alreadyActive = existingEnrollment?.status === "active";
    const nextVersion = existingEnrollment ? Number(existingEnrollment.version ?? 0) + 1 : 1;

    if (!alreadyActive) {
      transaction.set(enrollRef, {
        classId,
        courseId: klass.courseId,
        studentId,
        status: "active",
        joinedAt: existingEnrollment?.joinedAt ?? serverTimestamp(),
        endedAt: null,
        version: nextVersion,
        updatedAt: serverTimestamp(),
      });
    }
    transaction.update(classRef, {
      studentIds: arrayUnion(studentId),
      updatedAt: serverTimestamp(),
    });
    const studentUpdate: Record<string, unknown> = {
      currentClassIds: arrayUnion(classId),
      updatedAt: serverTimestamp(),
    };
    if (teacherIds.length > 0) studentUpdate.teacherIds = arrayUnion(...teacherIds);
    transaction.update(studentRef, studentUpdate);
    if (!alreadyActive) {
      queueUtilityDeliveryEvent(transaction, {
        eventType: "enrollment_completed",
        entityId: enrollmentId(classId, studentId),
        sourceId: enrollmentId(classId, studentId),
        studentId,
        version: nextVersion,
        actorUid,
      });
    }
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
    const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId));
    const [studentSnap, enrollmentSnap] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(enrollmentRef),
    ]);
    const currentClassIds = studentSnap.exists() ? (studentSnap.data() as StudentDoc).currentClassIds : [];
    const remainingClassIds = currentClassIds.filter((id) => id !== classId);
    const remainingClasses = await Promise.all(
      remainingClassIds.map((id) => transaction.get(doc(db, COLLECTIONS.CLASSES, id))),
    );
    const remainingTeacherIds = [...new Set(
      remainingClasses.flatMap((snap) => (snap.exists() ? (snap.data() as ClassDoc).teacherIds : [])),
    )];

    // Hoc sinh cu/nhap tay co the khong co ban ghi enrollment (giong syncStudentEnrollments): bo qua thay vi loi.
    if (enrollmentSnap.exists()) {
      transaction.update(enrollmentRef, {
        status: "ended",
        endedAt: serverTimestamp(),
        version: Math.max(1, Number(enrollmentSnap.data()?.version ?? 1)),
        updatedAt: serverTimestamp(),
      });
    }
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
 * Dong bo toan bo lop cua mot hoc sinh trong mot transaction. Chi UI Admin
 * goi luong nay; khoa hoc va giao vien duoc suy ra tu cac lop da chon.
 */
export async function syncStudentEnrollments(studentId: string, nextClassIds: string[], actorUid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, COLLECTIONS.STUDENTS, studentId);
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error("student_not_found");

    const student = studentSnap.data() as StudentDoc;
    const currentClassIds = [...new Set(student.currentClassIds)];
    const normalizedNextIds = [...new Set(nextClassIds)].filter(Boolean).sort();
    if (student.status !== "active" && normalizedNextIds.length > 0) throw new Error("student_not_active");
    const allClassIds = [...new Set([...currentClassIds, ...normalizedNextIds])];
    const classSnaps = await Promise.all(
      allClassIds.map((classId) => transaction.get(doc(db, COLLECTIONS.CLASSES, classId))),
    );
    const classById = new Map(
      classSnaps.filter((snap) => snap.exists()).map((snap) => [snap.id, snap.data() as ClassDoc]),
    );
    if (normalizedNextIds.some((classId) => !classById.has(classId) && !currentClassIds.includes(classId))) {
      throw new Error("class_not_found");
    }
    if (normalizedNextIds.some((classId) => {
      const klass = classById.get(classId);
      return klass !== undefined && klass.status !== "active";
    })) {
      throw new Error("class_not_active");
    }
    const existingNextIds = normalizedNextIds.filter((classId) => classById.has(classId));

    const addedClassIds = existingNextIds.filter((classId) => !currentClassIds.includes(classId));
    const removedClassIds = currentClassIds.filter((classId) => !existingNextIds.includes(classId));
    const changedClassIds = [...addedClassIds, ...removedClassIds];
    const enrollmentSnaps = await Promise.all(
      changedClassIds.map((classId) => transaction.get(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId)))),
    );
    const enrollmentByClassId = new Map(
      enrollmentSnaps.map((snap, index) => [changedClassIds[index], snap]),
    );

    addedClassIds.forEach((classId) => {
      const klass = classById.get(classId)!;
      const classRef = doc(db, COLLECTIONS.CLASSES, classId);
      const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId));
      const existingEnrollment = enrollmentByClassId.get(classId);
      if (existingEnrollment?.exists()) {
        const enrollment = existingEnrollment.data();
        if (enrollment.status !== "active") {
          const nextVersion = Number(enrollment.version ?? 0) + 1;
          transaction.update(enrollmentRef, { status: "active", endedAt: null, version: nextVersion, updatedAt: serverTimestamp() });
          queueUtilityDeliveryEvent(transaction, {
            eventType: "enrollment_completed", entityId: enrollmentId(classId, studentId), sourceId: enrollmentId(classId, studentId),
            studentId, version: nextVersion, actorUid,
          });
        }
      } else {
        transaction.set(enrollmentRef, {
          classId,
          courseId: klass.courseId,
          studentId,
          status: "active",
          joinedAt: serverTimestamp(),
          endedAt: null,
          version: 1,
          updatedAt: serverTimestamp(),
        });
        queueUtilityDeliveryEvent(transaction, {
          eventType: "enrollment_completed", entityId: enrollmentId(classId, studentId), sourceId: enrollmentId(classId, studentId),
          studentId, version: 1, actorUid,
        });
      }
      transaction.update(classRef, { studentIds: arrayUnion(studentId), updatedAt: serverTimestamp() });
    });

    removedClassIds.forEach((classId) => {
      const klass = classById.get(classId);
      const classRef = doc(db, COLLECTIONS.CLASSES, classId);
      const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId(classId, studentId));
      const existingEnrollment = enrollmentByClassId.get(classId);
      if (existingEnrollment?.exists()) {
        transaction.update(enrollmentRef, {
          status: "ended", endedAt: serverTimestamp(),
          version: Math.max(1, Number(existingEnrollment.data().version ?? 1)), updatedAt: serverTimestamp(),
        });
      } else if (klass) {
        transaction.set(enrollmentRef, {
          classId,
          courseId: klass.courseId,
          studentId,
          status: "ended",
          joinedAt: serverTimestamp(),
          endedAt: serverTimestamp(),
          version: 1,
          updatedAt: serverTimestamp(),
        });
      }
      if (klass) transaction.update(classRef, { studentIds: arrayRemove(studentId), updatedAt: serverTimestamp() });
    });

    const teacherIds = [...new Set(
      existingNextIds.flatMap((classId) => classById.get(classId)?.teacherIds ?? []),
    )].sort();
    transaction.update(studentRef, {
      currentClassIds: existingNextIds,
      teacherIds,
      updatedAt: serverTimestamp(),
    });
  });
}
