import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { ClassDoc, CourseDoc, CourseStatus, SubjectDoc } from "@/types/academic";
import type { UserDoc } from "@/types/user";
import { listAllQueryDocuments } from "@/services/firestore/pagination";
import { assertDeletionAllowed } from "@/services/firestore/deletionDependencies";

export interface CreateCourseInput {
  name: string;
  subjectIds: string[];
  teacherIds: string[];
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

const COURSE_CLASS_REVISION_CHANGED = "COURSE_CLASS_REVISION_CHANGED";

function courseClassRevision(course: CourseDoc): number {
  return course.classRevision ?? 0;
}

async function readStableCourseClasses(
  courseId: string,
  activeOnly: boolean,
): Promise<{ revision: number; documents: QueryDocumentSnapshot<DocumentData>[] }> {
  const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const before = await getDoc(courseRef);
    if (!before.exists()) throw new Error("COURSE_NOT_FOUND");
    const beforeRevision = courseClassRevision(before.data() as CourseDoc);
    const classesQuery = activeOnly
      ? query(collection(db, COLLECTIONS.CLASSES), where("courseId", "==", courseId), where("status", "==", "active"), limit(1))
      : query(collection(db, COLLECTIONS.CLASSES), where("courseId", "==", courseId));
    const classesSnapshot = await getDocs(classesQuery);
    const after = await getDoc(courseRef);
    if (!after.exists()) throw new Error("COURSE_NOT_FOUND");
    const afterRevision = courseClassRevision(after.data() as CourseDoc);
    if (beforeRevision === afterRevision) {
      return { revision: afterRevision, documents: classesSnapshot.docs };
    }
  }
  throw new Error(COURSE_CLASS_REVISION_CHANGED);
}

async function runWithStableCourseClasses(
  courseId: string,
  activeOnly: boolean,
  operation: (snapshot: { revision: number; documents: QueryDocumentSnapshot<DocumentData>[] }) => Promise<void>,
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const snapshot = await readStableCourseClasses(courseId, activeOnly);
    try {
      await operation(snapshot);
      return;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== COURSE_CLASS_REVISION_CHANGED) throw error;
    }
  }
  throw new Error(COURSE_CLASS_REVISION_CHANGED);
}

async function validateCourseReferences(transaction: Transaction, input: CreateCourseInput): Promise<{
  subjectIds: string[];
  teacherIds: string[];
}> {
  const subjectIds = [...new Set(input.subjectIds)].filter(Boolean).sort();
  const teacherIds = [...new Set(input.teacherIds)].filter(Boolean).sort();
  if (subjectIds.length === 0) throw new Error("COURSE_SUBJECT_REQUIRED");
  if (teacherIds.length === 0) throw new Error("COURSE_TEACHER_REQUIRED");
  const [subjectSnaps, teacherSnaps] = await Promise.all([
    Promise.all(subjectIds.map((id) => transaction.get(doc(db, COLLECTIONS.SUBJECTS, id)))),
    Promise.all(teacherIds.map((id) => transaction.get(doc(db, COLLECTIONS.USERS, id)))),
  ]);
  if (subjectSnaps.some((snap) => !snap.exists() || (snap.data() as SubjectDoc).status !== "active")) {
    throw new Error("COURSE_SUBJECT_INVALID");
  }
  if (teacherSnaps.some((snap) => {
    if (!snap.exists()) return true;
    const teacher = snap.data() as UserDoc;
    return teacher.role !== "teacher" || teacher.status !== "active";
  })) {
    throw new Error("COURSE_TEACHER_INVALID");
  }
  return { subjectIds, teacherIds };
}

/** ID auto - khong co ma khoa hoc nghiep vu rieng (A13). */
export async function createCourse(input: CreateCourseInput): Promise<void> {
  if (input.totalSessions > 200) throw new Error("COURSE_SESSION_LIMIT");
  const courseRef = doc(collection(db, COLLECTIONS.COURSES));
  await runTransaction(db, async (transaction) => {
    const { subjectIds, teacherIds } = await validateCourseReferences(transaction, input);
    transaction.set(courseRef, {
      name: input.name,
      subjectIds,
      teacherIds,
      pricePerSession: input.pricePerSession,
      tuitionFee: input.pricePerSession * input.totalSessions,
      totalSessions: input.totalSessions,
      startDate: toTimestamp(input.startDate),
      endDate: toTimestamp(input.endDate),
      status: input.status,
      classRevision: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Sua khoa hoc - giu nguyen ID, khong dong subjectIds cua ClassDoc (Lop hoc tu chon rieng). */
export async function updateCourse(courseId: string, input: CreateCourseInput): Promise<void> {
  if (input.totalSessions > 200) throw new Error("COURSE_SESSION_LIMIT");
  const startDate = toTimestamp(input.startDate);
  const endDate = toTimestamp(input.endDate);
  await runWithStableCourseClasses(courseId, false, async ({ revision, documents }) => runTransaction(db, async (transaction) => {
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    const [{ subjectIds, teacherIds }, courseSnap, ...classSnaps] = await Promise.all([
      validateCourseReferences(transaction, input),
      transaction.get(courseRef),
      ...documents.map((classSnap) => transaction.get(classSnap.ref)),
    ]);
    if (!courseSnap.exists()) throw new Error("COURSE_NOT_FOUND");
    if (courseClassRevision(courseSnap.data() as CourseDoc) !== revision) throw new Error(COURSE_CLASS_REVISION_CHANGED);
    const activeClasses = classSnaps
      .map((classSnap) => classSnap.data() as ClassDoc)
      .filter((klass) => klass.status === "active");
    if (input.status !== "active" && activeClasses.length > 0) throw new Error("COURSE_HAS_ACTIVE_CLASSES");
    activeClasses.forEach((klass) => {
      if (klass.subjectIds.some((subjectId) => !subjectIds.includes(subjectId))) throw new Error("COURSE_CLASS_SUBJECT_MISMATCH");
      if (klass.teacherIds.some((teacherId) => !teacherIds.includes(teacherId))) throw new Error("COURSE_CLASS_TEACHER_MISMATCH");
      if (klass.recurrence && klass.recurrence.sessionCount !== input.totalSessions) throw new Error("COURSE_CLASS_SESSION_MISMATCH");
      if (klass.recurrence && (
        klass.recurrence.startDate.toMillis() < startDate.toMillis() ||
        klass.recurrence.endDate.toMillis() > endDate.toMillis()
      )) {
        throw new Error("COURSE_CLASS_DATE_MISMATCH");
      }
    });
    transaction.update(courseRef, {
      name: input.name,
      subjectIds,
      teacherIds,
      pricePerSession: input.pricePerSession,
      tuitionFee: input.pricePerSession * input.totalSessions,
      totalSessions: input.totalSessions,
      startDate,
      endDate,
      status: input.status,
      updatedAt: serverTimestamp(),
    });
  }));
}

export async function setCourseStatus(courseId: string, status: CourseStatus): Promise<void> {
  await runWithStableCourseClasses(courseId, true, async ({ revision, documents }) => runTransaction(db, async (transaction) => {
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    const [courseSnap, ...activeClassSnaps] = await Promise.all([
      transaction.get(courseRef),
      ...documents.map((classSnap) => transaction.get(classSnap.ref)),
    ]);
    if (!courseSnap.exists()) throw new Error("COURSE_NOT_FOUND");
    if (courseClassRevision(courseSnap.data() as CourseDoc) !== revision) throw new Error(COURSE_CLASS_REVISION_CHANGED);
    if (status !== "active" && activeClassSnaps.some((classSnap) => classSnap.exists() && (classSnap.data() as ClassDoc).status === "active")) {
      throw new Error("COURSE_HAS_ACTIVE_CLASSES");
    }
    transaction.update(courseRef, { status, updatedAt: serverTimestamp() });
  }));
}

/** Xoa cung khoa hoc chi khi khong con bat ky du lieu nghiep vu nao tham chieu. */
export async function deleteCourse(courseId: string): Promise<void> {
  await assertDeletionAllowed("course", courseId);
  await runWithStableCourseClasses(courseId, false, async ({ revision, documents }) => runTransaction(db, async (transaction) => {
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    const [courseSnap, ...classSnaps] = await Promise.all([
      transaction.get(courseRef),
      ...documents.map((classSnap) => transaction.get(classSnap.ref)),
    ]);
    if (!courseSnap.exists()) throw new Error("COURSE_NOT_FOUND");
    if (courseClassRevision(courseSnap.data() as CourseDoc) !== revision) throw new Error(COURSE_CLASS_REVISION_CHANGED);
    if (classSnaps.some((classSnap) => classSnap.exists())) throw new Error("DELETION_BLOCKED");
    transaction.delete(courseRef);
  }));
}

export async function listCourses(): Promise<(CourseDoc & { id: string })[]> {
  const documents = await listAllQueryDocuments(
    COLLECTIONS.COURSES,
    [orderBy("name")],
    200,
  );
  return documents.map((d) => ({ id: d.id, ...(d.data() as CourseDoc) }));
}

export async function getCourse(courseId: string): Promise<(CourseDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.COURSES, courseId));
  return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as CourseDoc) } : null;
}
