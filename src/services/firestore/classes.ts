import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { generateRecurringSessions } from "@/utils/recurrence";
import type { ClassDoc, ClassStatus, CourseCurriculumDoc, CourseCurriculumItemDoc, CourseDoc, SessionDoc, StudentDoc } from "@/types/academic";
import type { DocumentData, QueryConstraint, QueryDocumentSnapshot, QuerySnapshot } from "firebase/firestore";
import { decodeClassDoc } from "@/services/firestore/decoders";

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
  const ref = doc(collection(db, COLLECTIONS.CLASSES));
  await runTransaction(db, async (transaction) => {
    const courseSnap = await transaction.get(doc(db, COLLECTIONS.COURSES, input.courseId));
    const courseData = courseSnap.exists() ? courseSnap.data() as CourseDoc : null;
    validateClassAgainstCourse(input, courseData);
    transaction.set(ref, {
      name: input.name,
      courseId: input.courseId,
      subjectIds: input.subjectIds,
      teacherIds: input.teacherIds,
      studentIds: [],
      scheduleText: input.scheduleText,
      location: input.location,
      status: input.status,
      curriculumId: courseData.activeCurriculumId || null,
      curriculumVersion: courseData.activeCurriculumVersion || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(courseSnap.ref, { classRevision: nextClassRevision(courseData) });
  });
  return ref.id;
}

export interface ClassScheduleRecurrenceInput {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startDate: Date;
  sessionCount: number;
}

function validateClassAgainstCourse(input: UpsertClassInput, course: CourseDoc | null): asserts course is CourseDoc {
  if (!course) throw new Error("COURSE_NOT_FOUND");
  if (course.status !== "active") throw new Error("COURSE_NOT_ACTIVE");
  if (input.subjectIds.length === 0) throw new Error("CLASS_SUBJECT_REQUIRED");
  if (new Set(input.subjectIds).size !== input.subjectIds.length || new Set(input.teacherIds).size !== input.teacherIds.length) {
    throw new Error("CLASS_REFERENCE_DUPLICATE");
  }
  if (input.subjectIds.some((subjectId) => !course.subjectIds.includes(subjectId))) {
    throw new Error("CLASS_SUBJECT_NOT_IN_COURSE");
  }
  if (input.teacherIds.some((teacherId) => !course.teacherIds.includes(teacherId))) {
    throw new Error("CLASS_TEACHER_NOT_IN_COURSE");
  }
}

function nextClassRevision(course: CourseDoc): number {
  return (course.classRevision ?? 0) + 1;
}

const FULL_DOW_LABEL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function buildScheduleText(recurrence: ClassScheduleRecurrenceInput): string {
  const days = [...recurrence.daysOfWeek].sort((a, b) => a - b).map((day) => FULL_DOW_LABEL[day]).join(", ");
  return `${days} · ${recurrence.startTime}-${recurrence.endTime}`;
}

/**
 * Tao lop + sinh toan bo buoi hoc lap theo tuan trong 1 lan ghi atomic.
 * Chi dung cho luong tao lop cua Admin - Rules cho phep vi isAdmin() khong
 * can get() lop hoc chua commit (xem canManageClass trong firestore.rules).
 */
export async function createClassWithSchedule(
  input: UpsertClassInput & { recurrence: ClassScheduleRecurrenceInput },
): Promise<string> {
  if (input.recurrence.sessionCount < 1 || input.recurrence.sessionCount > 200) {
    throw new Error("CLASS_SESSION_LIMIT");
  }
  const daysOfWeek = [...new Set(input.recurrence.daysOfWeek)];
  if (daysOfWeek.length < 1 || daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("INVALID_RECURRENCE_DAYS");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.recurrence.startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.recurrence.endTime) ||
      input.recurrence.endTime <= input.recurrence.startTime) {
    throw new Error("INVALID_RECURRENCE_TIME");
  }
  const { sessions, endDate } = generateRecurringSessions({
    startDate: input.recurrence.startDate,
    daysOfWeek: input.recurrence.daysOfWeek,
    startTime: input.recurrence.startTime,
    endTime: input.recurrence.endTime,
    sessionCount: input.recurrence.sessionCount,
  });

  const classRef = doc(collection(db, COLLECTIONS.CLASSES));
  await runTransaction(db, async (transaction) => {
    const courseSnap = await transaction.get(doc(db, COLLECTIONS.COURSES, input.courseId));
    const courseData = courseSnap.exists() ? courseSnap.data() as CourseDoc : null;
    validateClassAgainstCourse(input, courseData);
    if (input.recurrence.sessionCount !== courseData.totalSessions) {
      throw new Error("CLASS_COURSE_SESSION_MISMATCH");
    }
    const activeCurriculumId = courseData.activeCurriculumId || null;
    const activeCurriculumVersion = courseData.activeCurriculumVersion || null;
    let curriculumItems: Array<CourseCurriculumItemDoc & { id: string }> = [];
    if (activeCurriculumId && activeCurriculumVersion) {
      const curriculumSnap = await transaction.get(doc(db, COLLECTIONS.COURSE_CURRICULA, activeCurriculumId));
      if (!curriculumSnap.exists()) throw new Error("CURRICULUM_NOT_FOUND");
      const curriculum = curriculumSnap.data() as CourseCurriculumDoc;
      if (curriculum.status !== "published" || curriculum.courseId !== input.courseId || curriculum.version !== activeCurriculumVersion) {
        throw new Error("CURRICULUM_POINTER_INVALID");
      }
      if (curriculum.itemCount !== input.recurrence.sessionCount || curriculum.itemIds.length !== curriculum.itemCount) {
        throw new Error("CURRICULUM_ITEM_COUNT_MISMATCH");
      }
      const itemSnaps = await Promise.all(curriculum.itemIds.map((itemId) => (
        transaction.get(doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, itemId))
      )));
      if (itemSnaps.some((itemSnap) => !itemSnap.exists())) throw new Error("CURRICULUM_ITEM_MISSING");
      curriculumItems = itemSnaps.map((itemSnap) => ({ id: itemSnap.id, ...(itemSnap.data() as CourseCurriculumItemDoc) }));
      curriculumItems.forEach((item, index) => {
        if (item.courseId !== input.courseId || item.curriculumVersion !== activeCurriculumVersion ||
            item.sequenceNumber !== index + 1 || item.status !== "ready" || !item.standardLessonId ||
            !courseData.subjectIds.includes(item.subjectId)) {
          throw new Error("CURRICULUM_ITEM_INVALID");
        }
      });
    }

    transaction.set(classRef, {
      name: input.name,
      courseId: input.courseId,
      subjectIds: input.subjectIds,
      teacherIds: input.teacherIds,
      studentIds: [],
      scheduleText: buildScheduleText(input.recurrence),
      location: input.location,
      status: input.status,
      curriculumId: activeCurriculumId,
      curriculumVersion: activeCurriculumVersion,
      recurrence: {
        daysOfWeek: input.recurrence.daysOfWeek,
        startTime: input.recurrence.startTime,
        endTime: input.recurrence.endTime,
        startDate: Timestamp.fromDate(input.recurrence.startDate),
        endDate: Timestamp.fromDate(endDate),
        sessionCount: sessions.length,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    sessions.forEach((session, index) => {
      const currItem = curriculumItems[index] || null;
      transaction.set(doc(collection(db, COLLECTIONS.SESSIONS)), {
        classId: classRef.id,
        title: input.name,
        startAt: Timestamp.fromDate(session.startAt),
        endAt: Timestamp.fromDate(session.endAt),
        location: input.location,
        status: "scheduled",
        note: "",
        makeUpForSessionId: null,
        sequenceNumber: index + 1,
        curriculumVersion: activeCurriculumVersion,
        curriculumItemId: currItem ? currItem.id : null,
        lessonPlanId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    transaction.update(courseSnap.ref, { classRevision: nextClassRevision(courseData) });
  });
  return classRef.id;
}

/**
 * Khong dong studentIds tai day - viec ghi danh di qua services/firestore/enrollments.ts.
 * Khi Admin doi phan cong giao vien, cap nhat teacherIds tren cac hoc sinh cua
 * lop trong cung transaction de student scope va Messenger khong bi lech.
 */
export async function updateClass(classId: string, input: UpsertClassInput): Promise<void> {
  if (input.status === "cancelled") {
    await deleteClass(classId);
    return;
  }
  const actor = await getCurrentUserDoc();
  const shouldSyncStudents = isAdminUser(actor);
  await runTransaction(db, async (transaction) => {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classSnap = await transaction.get(classRef);
    if (!classSnap.exists()) throw new Error("class_not_found");

    const currentClass = classSnap.data() as ClassDoc;
    if (input.courseId !== currentClass.courseId) throw new Error("CLASS_COURSE_IMMUTABLE");
    const courseSnap = await transaction.get(doc(db, COLLECTIONS.COURSES, currentClass.courseId));
    const courseData = courseSnap.exists() ? courseSnap.data() as CourseDoc : null;
    validateClassAgainstCourse(input, courseData);
    const nextTeacherIds = [...new Set(input.teacherIds)].sort();

    const studentRefs = shouldSyncStudents
      ? currentClass.studentIds.map((studentId) => doc(db, COLLECTIONS.STUDENTS, studentId))
      : [];
    const studentSnaps = await Promise.all(studentRefs.map((studentRef) => transaction.get(studentRef)));
    const students = studentSnaps
      .filter((studentSnap) => studentSnap.exists())
      .map((studentSnap) => ({ ref: studentSnap.ref, data: studentSnap.data() as StudentDoc }));

    const otherClassIds = [...new Set(students.flatMap(({ data }) => data.currentClassIds))]
      .filter((otherClassId) => otherClassId !== classId);
    const otherClassSnaps = await Promise.all(
      otherClassIds.map((otherClassId) => transaction.get(doc(db, COLLECTIONS.CLASSES, otherClassId))),
    );
    const teacherIdsByClass = new Map(
      otherClassSnaps
        .filter((otherClassSnap) => otherClassSnap.exists())
        .map((otherClassSnap) => [otherClassSnap.id, (otherClassSnap.data() as ClassDoc).teacherIds]),
    );

    transaction.update(classRef, {
      name: input.name,
      courseId: input.courseId,
      subjectIds: input.subjectIds,
      teacherIds: nextTeacherIds,
      scheduleText: input.scheduleText,
      location: input.location,
      status: input.status,
      updatedAt: serverTimestamp(),
    });
    transaction.update(courseSnap.ref, { classRevision: nextClassRevision(courseData) });

    students.forEach(({ ref, data }) => {
      const teacherIds = [...new Set([
        ...nextTeacherIds,
        ...data.currentClassIds
          .filter((studentClassId) => studentClassId !== classId)
          .flatMap((studentClassId) => teacherIdsByClass.get(studentClassId) ?? []),
      ])];
      transaction.update(ref, { teacherIds, updatedAt: serverTimestamp() });
    });
  });
}

/**
 * Xoa mem lop hoc: giu lich su lop/diem danh/hoc phi, chi chuyen lop sang
 * cancelled va huy cac buoi hoc tu hien tai tro di.
 */
export async function deleteClass(classId: string): Promise<void> {
  const now = new Date();
  const classRef = doc(db, COLLECTIONS.CLASSES, classId);
  const classSnap = await getDoc(classRef);
  if (!classSnap.exists()) throw new Error("class_not_found");
  const courseId = (classSnap.data() as ClassDoc).courseId;
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  let firstBatch = true;
  while (true) {
    const constraints: QueryConstraint[] = [
      where("classId", "==", classId),
      where("startAt", ">=", Timestamp.fromDate(now)),
      orderBy("startAt"),
      limit(498),
    ];
    if (cursor) constraints.splice(3, 0, startAfter(cursor));
    const sessionsSnap = await getDocs(query(
      collection(db, COLLECTIONS.SESSIONS),
      ...constraints,
    ));
    const batch = writeBatch(db);
    if (firstBatch) {
      batch.update(classRef, { status: "cancelled", updatedAt: serverTimestamp() });
      batch.update(doc(db, COLLECTIONS.COURSES, courseId), { classRevision: increment(1) });
    }
    sessionsSnap.docs.forEach((sessionDoc) => {
      if ((sessionDoc.data() as SessionDoc).status !== "cancelled") batch.update(sessionDoc.ref, {
        status: "cancelled",
        note: "Lớp học đã được xóa mềm.",
        updatedAt: serverTimestamp(),
      });
    });
    if (firstBatch || sessionsSnap.docs.some((item) => (item.data() as SessionDoc).status !== "cancelled")) await batch.commit();
    firstBatch = false;
    if (sessionsSnap.size < 498) break;
    cursor = sessionsSnap.docs[sessionsSnap.docs.length - 1];
  }
}

/** Danh sach lop - Admin xem tat ca, Teacher chi xem lop duoc phan cong. */
export async function listClasses(): Promise<(ClassDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser) return [];

  if (!isAdminUser(currentUser) && !isTeacherUser(currentUser)) return [];

  const documents: QueryDocumentSnapshot<DocumentData, DocumentData>[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData, DocumentData> | null = null;
  do {
    const constraints: QueryConstraint[] = isTeacherUser(currentUser)
      ? [where("teacherIds", "array-contains", currentUser.uid)]
      : [orderBy("name")];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(200));
    const snapshot: QuerySnapshot<DocumentData, DocumentData> = await getDocs(query(
      collection(db, COLLECTIONS.CLASSES),
      ...constraints,
    ));
    documents.push(...snapshot.docs);
    cursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null;
    if (snapshot.size < 200) break;
  } while (cursor);
  return documents
    .map((d) => ({ id: d.id, ...decodeClassDoc(d.data(), `${COLLECTIONS.CLASSES}/${d.id}`) }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export async function getClass(classId: string): Promise<(ClassDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CLASSES, classId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...decodeClassDoc(snap.data(), `${COLLECTIONS.CLASSES}/${snap.id}`) };
}

function isUnavailableClass(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String(error.code);
  return code === "not-found" || code === "permission-denied";
}

/**
 * Viewer data can temporarily reference a class that was removed or is no
 * longer readable. Ignore only those stale links; connectivity errors still
 * reject so the UI does not misreport them as an unassigned student.
 */
export async function listAccessibleClassesByIds(classIds: string[]): Promise<(ClassDoc & { id: string })[]> {
  const uniqueIds = [...new Set(classIds)].filter(Boolean);
  const classes = await Promise.all(uniqueIds.map(async (classId) => {
    try {
      return await getClass(classId);
    } catch (error) {
      if (isUnavailableClass(error)) return null;
      throw error;
    }
  }));
  return classes.filter((klass): klass is NonNullable<typeof klass> => !!klass);
}
