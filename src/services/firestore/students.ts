import {
  arrayRemove,
  arrayUnion,
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
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { normalizeEmail } from "@/utils/email";
import type { ClassDoc, StudentDoc, StudentStatus } from "@/types/academic";
import type { UserDoc } from "@/types/user";
import type { ParentProfileInput } from "@/services/firestore/users";
import { decodeStudentDoc } from "@/services/firestore/decoders";
import { queueUtilityDeliveryEvent } from "@/services/firestore/messengerDelivery";
import { assertDeletionAllowed } from "@/services/firestore/deletionDependencies";

export interface CreateStudentInput {
  studentCode: string;
  fullName: string;
  nickname?: string;
  dateOfBirth: string;
}

export interface CreateStudentWithRelationsInput extends CreateStudentInput {
  staffNote?: string;
  classId?: string;
  parentEmail?: string;
  parentProfile?: ParentProfileInput;
}

export interface UpdateStudentInput {
  fullName: string;
  nickname?: string;
  dateOfBirth: string;
  staffNote?: string;
}

export interface UpdateStudentWithRelationsInput extends UpdateStudentInput {
  actorUid: string;
  classIds?: string[];
  parentEmail?: string;
  primaryParentUid?: string;
  parentProfile?: ParentProfileInput;
}

/** ID = ma hoc sinh chuan hoa (A13) - khong query kiem tra ton tai truoc. */
export function normalizeStudentCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function createStudentWithRelations(input: CreateStudentWithRelationsInput): Promise<void> {
  const id = normalizeStudentCode(input.studentCode);
  const actor = await getCurrentUserDoc();
  if (!actor) throw new Error("AUTH_REQUIRED");
  const email = input.parentEmail ? normalizeEmail(input.parentEmail) : "";
  const parentQuery = email
    ? await getDocs(query(collection(db, COLLECTIONS.USERS), where("email", "==", email), limit(1)))
    : null;
  if (email && parentQuery?.empty) throw new Error("PARENT_NOT_FOUND");
  const parentRef = parentQuery?.docs[0]?.ref ?? null;

  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, COLLECTIONS.STUDENTS, id);
    const classRef = input.classId ? doc(db, COLLECTIONS.CLASSES, input.classId) : null;
    const [studentSnap, classSnap, parentSnap] = await Promise.all([
      transaction.get(studentRef),
      classRef ? transaction.get(classRef) : Promise.resolve(null),
      parentRef ? transaction.get(parentRef) : Promise.resolve(null),
    ]);
    if (studentSnap.exists()) throw new Error("student_code_exists");
    const klass = classSnap?.exists() ? classSnap.data() as ClassDoc : null;
    if (classRef && !klass) throw new Error("CLASS_NOT_FOUND");
    if (klass && klass.status !== "active") throw new Error("CLASS_NOT_ACTIVE");
    if (actor.role === "teacher" && !klass) throw new Error("TEACHER_CLASS_REQUIRED");
    if (actor.role === "teacher" && klass && !klass.teacherIds.includes(actor.uid)) {
      throw new Error("TEACHER_CLASS_FORBIDDEN");
    }
    const parent = parentSnap?.exists() ? parentSnap.data() as UserDoc : null;
    if (parentRef && !parent) throw new Error("PARENT_NOT_FOUND");
    if (parent && parent.role !== "viewer") throw new Error("PARENT_NOT_VIEWER");
    if (parent && parent.status !== "active") throw new Error("PARENT_NOT_ACTIVE");
    if (parent && parent.email.toLowerCase() !== email) throw new Error("PARENT_EMAIL_CHANGED");

    transaction.set(studentRef, {
      studentCode: id,
      fullName: input.fullName,
      nickname: input.nickname ?? "",
      dateOfBirth: input.dateOfBirth,
      parentUids: parentRef ? [parentRef.id] : [],
      currentClassIds: classRef ? [classRef.id] : [],
      teacherIds: klass?.teacherIds ?? (actor.role === "teacher" ? [actor.uid] : []),
      staffNote: input.staffNote ?? "",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (classRef && klass) {
      const enrollmentDocumentId = `${classRef.id}_${id}`;
      transaction.set(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentDocumentId), {
        classId: classRef.id,
        courseId: klass.courseId,
        studentId: id,
        status: "active",
        joinedAt: serverTimestamp(),
        endedAt: null,
        version: 1,
        updatedAt: serverTimestamp(),
      });
      queueUtilityDeliveryEvent(transaction, {
        eventType: "enrollment_completed",
        entityId: enrollmentDocumentId,
        sourceId: enrollmentDocumentId,
        studentId: id,
        version: 1,
        actorUid: actor.uid,
      });
      transaction.update(classRef, { studentIds: arrayUnion(id), updatedAt: serverTimestamp() });
    }
    if (parentRef) {
      const profile = input.parentProfile;
      transaction.update(parentRef, {
        studentIds: arrayUnion(id),
        ...(profile?.displayName !== undefined ? { displayName: profile.displayName } : {}),
        ...(profile?.address !== undefined ? { address: profile.address } : {}),
        ...(profile?.phone !== undefined ? { phone: profile.phone } : {}),
        ...(profile?.facebookUrl !== undefined ? { facebookUrl: profile.facebookUrl } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function updateStudent(studentDocId: string, input: UpdateStudentInput): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.STUDENTS, studentDocId), {
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth,
    ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
    ...(input.staffNote !== undefined ? { staffNote: input.staffNote } : {}),
    updatedAt: serverTimestamp(),
  });
}

/** Cap nhat ho so, lop/ghi danh va phu huynh trong cung mot transaction. */
export async function updateStudentWithRelations(
  studentDocId: string,
  input: UpdateStudentWithRelationsInput,
): Promise<void> {
  const parentEmail = input.parentEmail ? normalizeEmail(input.parentEmail) : "";
  const parentQuery = parentEmail
    ? await getDocs(query(collection(db, COLLECTIONS.USERS), where("email", "==", parentEmail), limit(1)))
    : null;
  if (parentEmail && parentQuery?.empty) throw new Error("PARENT_NOT_FOUND");
  const nextParentRef = parentQuery?.docs[0]?.ref ?? null;

  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, COLLECTIONS.STUDENTS, studentDocId);
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error("STUDENT_NOT_FOUND");
    const student = studentSnap.data() as StudentDoc;

    const nextClassIds = input.classIds === undefined
      ? student.currentClassIds
      : [...new Set(input.classIds)].filter(Boolean).sort();
    const allClassIds = [...new Set([...student.currentClassIds, ...nextClassIds])];
    const changedClassIds = input.classIds === undefined
      ? []
      : allClassIds.filter((classId) => (
        student.currentClassIds.includes(classId) !== nextClassIds.includes(classId)
      ));
    const classRefs = allClassIds.map((classId) => doc(db, COLLECTIONS.CLASSES, classId));
    const enrollmentRefs = changedClassIds.map((classId) => (
      doc(db, COLLECTIONS.ENROLLMENTS, `${classId}_${studentDocId}`)
    ));
    const currentParentRef = input.primaryParentUid
      ? doc(db, COLLECTIONS.USERS, input.primaryParentUid)
      : null;
    const [classSnaps, enrollmentSnaps, currentParentSnap, nextParentSnap] = await Promise.all([
      Promise.all(classRefs.map((classRef) => transaction.get(classRef))),
      Promise.all(enrollmentRefs.map((enrollmentRef) => transaction.get(enrollmentRef))),
      currentParentRef ? transaction.get(currentParentRef) : Promise.resolve(null),
      nextParentRef ? transaction.get(nextParentRef) : Promise.resolve(null),
    ]);
    const classById = new Map(
      classSnaps.filter((snap) => snap.exists()).map((snap) => [snap.id, snap.data() as ClassDoc]),
    );
    if (nextClassIds.some((classId) => !classById.has(classId))) throw new Error("CLASS_NOT_FOUND");
    if (nextClassIds.some((classId) => classById.get(classId)?.status !== "active")) {
      throw new Error("CLASS_NOT_ACTIVE");
    }
    if (student.status !== "active" && nextClassIds.length > 0) throw new Error("STUDENT_NOT_ACTIVE");

    const nextParent = nextParentSnap?.exists() ? nextParentSnap.data() as UserDoc : null;
    if (nextParentRef && !nextParent) throw new Error("PARENT_NOT_FOUND");
    if (nextParent && nextParent.role !== "viewer") throw new Error("PARENT_NOT_VIEWER");
    if (nextParent && nextParent.status !== "active") throw new Error("PARENT_NOT_ACTIVE");
    if (nextParent && normalizeEmail(nextParent.email) !== parentEmail) throw new Error("PARENT_EMAIL_CHANGED");

    const enrollmentByClassId = new Map(
      enrollmentSnaps.map((snap, index) => [changedClassIds[index], snap]),
    );
    const addedClassIds = changedClassIds.filter((classId) => nextClassIds.includes(classId));
    const removedClassIds = changedClassIds.filter((classId) => !nextClassIds.includes(classId));

    addedClassIds.forEach((classId) => {
      const klass = classById.get(classId)!;
      const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, `${classId}_${studentDocId}`);
      const enrollmentSnap = enrollmentByClassId.get(classId);
      const enrollment = enrollmentSnap?.exists() ? enrollmentSnap.data() : null;
      const version = enrollment ? Number(enrollment.version ?? 0) + 1 : 1;
      if (enrollment) {
        transaction.update(enrollmentRef, { status: "active", endedAt: null, version, updatedAt: serverTimestamp() });
      } else {
        transaction.set(enrollmentRef, {
          classId, courseId: klass.courseId, studentId: studentDocId, status: "active",
          joinedAt: serverTimestamp(), endedAt: null, version, updatedAt: serverTimestamp(),
        });
      }
      transaction.update(doc(db, COLLECTIONS.CLASSES, classId), {
        studentIds: arrayUnion(studentDocId), updatedAt: serverTimestamp(),
      });
      queueUtilityDeliveryEvent(transaction, {
        eventType: "enrollment_completed",
        entityId: `${classId}_${studentDocId}`,
        sourceId: `${classId}_${studentDocId}`,
        studentId: studentDocId,
        version,
        actorUid: input.actorUid,
      });
    });

    removedClassIds.forEach((classId) => {
      const klass = classById.get(classId);
      const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, `${classId}_${studentDocId}`);
      const enrollmentSnap = enrollmentByClassId.get(classId);
      if (enrollmentSnap?.exists()) {
        transaction.update(enrollmentRef, {
          status: "ended",
          endedAt: serverTimestamp(),
          version: Math.max(1, Number(enrollmentSnap.data().version ?? 1)),
          updatedAt: serverTimestamp(),
        });
      }
      if (klass) {
        transaction.update(doc(db, COLLECTIONS.CLASSES, classId), {
          studentIds: arrayRemove(studentDocId), updatedAt: serverTimestamp(),
        });
      }
    });

    let parentUids = student.parentUids;
    if (nextParentRef && nextParent) {
      const replacingParent = input.primaryParentUid && input.primaryParentUid !== nextParentRef.id;
      if (replacingParent && currentParentSnap?.exists()) {
        const currentParent = currentParentSnap.data() as UserDoc;
        transaction.update(currentParentSnap.ref, {
          studentIds: currentParent.studentIds.filter((id) => id !== studentDocId),
          updatedAt: serverTimestamp(),
        });
      }
      parentUids = replacingParent
        ? [...new Set(student.parentUids.filter((uid) => uid !== input.primaryParentUid).concat(nextParentRef.id))]
        : [...new Set([...student.parentUids, nextParentRef.id])];
      const profile = input.parentProfile;
      transaction.update(nextParentRef, {
        studentIds: [...new Set([...nextParent.studentIds, studentDocId])],
        ...(profile?.displayName !== undefined ? { displayName: profile.displayName } : {}),
        ...(profile?.address !== undefined ? { address: profile.address } : {}),
        ...(profile?.phone !== undefined ? { phone: profile.phone } : {}),
        ...(profile?.facebookUrl !== undefined ? { facebookUrl: profile.facebookUrl } : {}),
        updatedAt: serverTimestamp(),
      });
    }

    const teacherIds = input.classIds === undefined
      ? student.teacherIds
      : [...new Set(nextClassIds.flatMap((classId) => classById.get(classId)?.teacherIds ?? []))].sort();
    transaction.update(studentRef, {
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.staffNote !== undefined ? { staffNote: input.staffNote } : {}),
      ...(input.classIds !== undefined ? { currentClassIds: nextClassIds, teacherIds } : {}),
      ...(nextParentRef ? { parentUids } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function setStudentStatus(studentDocId: string, status: StudentStatus): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, COLLECTIONS.STUDENTS, studentDocId);
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error("STUDENT_NOT_FOUND");
    const student = studentSnap.data() as StudentDoc;
    if (status === "inactive") {
      const classRefs = student.currentClassIds.map((classId) => doc(db, COLLECTIONS.CLASSES, classId));
      const enrollmentRefs = student.currentClassIds.map((classId) => (
        doc(db, COLLECTIONS.ENROLLMENTS, `${classId}_${studentDocId}`)
      ));
      const [classSnaps, enrollmentSnaps] = await Promise.all([
        Promise.all(classRefs.map((classRef) => transaction.get(classRef))),
        Promise.all(enrollmentRefs.map((enrollmentRef) => transaction.get(enrollmentRef))),
      ]);
      if (enrollmentSnaps.some((enrollmentSnap, index) => (
        enrollmentSnap.exists() && enrollmentSnap.data().status === "active" && classSnaps[index].exists()
      ))) {
        throw new Error("STUDENT_HAS_ACTIVE_CLASSES");
      }
      classSnaps.forEach((classSnap) => {
        if (classSnap.exists()) transaction.update(classSnap.ref, {
          studentIds: arrayRemove(studentDocId),
          updatedAt: serverTimestamp(),
        });
      });
    }
    transaction.update(studentRef, {
      status,
      ...(status === "inactive" ? { currentClassIds: [], teacherIds: [] } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteStudent(studentDocId: string): Promise<void> {
  await assertDeletionAllowed("student", studentDocId);
  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, COLLECTIONS.STUDENTS, studentDocId);
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error("STUDENT_NOT_FOUND");
    transaction.delete(studentRef);
  });
}

async function listStudentPages(baseConstraints: QueryConstraint[]): Promise<(StudentDoc & { id: string })[]> {
  const documents: QueryDocumentSnapshot<DocumentData, DocumentData>[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData, DocumentData> | null = null;
  do {
    const snapshot: QuerySnapshot<DocumentData, DocumentData> = await getDocs(query(
      collection(db, COLLECTIONS.STUDENTS),
      ...baseConstraints,
      ...(cursor ? [startAfter(cursor)] : []),
      limit(200),
    ));
    documents.push(...snapshot.docs);
    cursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null;
    if (snapshot.size < 200) break;
  } while (cursor);
  return documents.map((item) => ({
    id: item.id,
    ...decodeStudentDoc(item.data(), `${COLLECTIONS.STUDENTS}/${item.id}`),
  }));
}

export async function listStudents(): Promise<(StudentDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  const students = await listStudentPages(currentUser?.role === "teacher"
    ? [where("teacherIds", "array-contains", currentUser.uid)]
    : [orderBy("fullName")]);
  return students
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
}

/** Danh bạ dùng riêng cho ghi danh. Rules vẫn giới hạn quyền ghi theo lớp phụ trách. */
export async function listEnrollmentCandidates(): Promise<(StudentDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) return listStudents();
  if (!isAdminUser(currentUser)) return [];
  return listStudentPages([orderBy("fullName")]);
}

export async function getStudent(studentId: string): Promise<(StudentDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
  return snapshot.exists() ? {
    id: snapshot.id,
    ...decodeStudentDoc(snapshot.data(), `${COLLECTIONS.STUDENTS}/${snapshot.id}`),
  } : null;
}

export type LinkParentFailureReason = "not_found" | "not_viewer" | "error";
export type LinkParentResult = { linked: true } | { linked: false; reason: LinkParentFailureReason };

/**
 * Gan tai khoan Phu huynh da ton tai (da claim invite) vao hoc sinh - cap
 * nhat 2 chieu users/{uid}.studentIds va students/{id}.parentUids trong 1
 * batch de dam bao nhat quan (A5 buoc 3, Section 10.1).
 *
 * Luu y: Firestore Rules hien tai (Phase 2) chi cho phep Admin sua
 * users/{uid}.studentIds - Teacher goi ham nay se bi tu choi o buoc batch
 * commit (dung thiet ke, xem A11).
 */
export async function linkParentToStudent(
  studentDocId: string,
  parentEmail: string,
  parentProfile?: ParentProfileInput,
): Promise<LinkParentResult> {
  try {
    const email = normalizeEmail(parentEmail);
    const q = query(collection(db, COLLECTIONS.USERS), where("email", "==", email), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { linked: false, reason: "not_found" };
    }
    const userSnap = snap.docs[0];
    const user = userSnap.data() as UserDoc;
    if (user.role !== "viewer") {
      return { linked: false, reason: "not_viewer" };
    }

    const batch = writeBatch(db);
    const userUpdate: Record<string, string | ReturnType<typeof serverTimestamp> | ReturnType<typeof arrayUnion>> = {
      studentIds: arrayUnion(studentDocId),
      updatedAt: serverTimestamp(),
    };
    if (parentProfile?.displayName !== undefined) userUpdate.displayName = parentProfile.displayName;
    if (parentProfile?.address !== undefined) userUpdate.address = parentProfile.address;
    if (parentProfile?.phone !== undefined) userUpdate.phone = parentProfile.phone;
    if (parentProfile?.facebookUrl !== undefined) userUpdate.facebookUrl = parentProfile.facebookUrl;
    batch.update(doc(db, COLLECTIONS.USERS, userSnap.id), userUpdate);
    batch.update(doc(db, COLLECTIONS.STUDENTS, studentDocId), {
      parentUids: arrayUnion(userSnap.id),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return { linked: true };
  } catch (err) {
    console.error("linkParentToStudent failed", err);
    return { linked: false, reason: "error" };
  }
}
