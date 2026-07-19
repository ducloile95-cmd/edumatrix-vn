import {
  addDoc,
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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { generateRecurringSessions } from "@/utils/recurrence";
import type { ClassDoc, ClassStatus, StudentDoc } from "@/types/academic";

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

export interface ClassScheduleRecurrenceInput {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startDate: Date;
  sessionCount: number;
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
  const { sessions, endDate } = generateRecurringSessions({
    startDate: input.recurrence.startDate,
    daysOfWeek: input.recurrence.daysOfWeek,
    startTime: input.recurrence.startTime,
    endTime: input.recurrence.endTime,
    sessionCount: input.recurrence.sessionCount,
  });

  const batch = writeBatch(db);
  const classRef = doc(collection(db, COLLECTIONS.CLASSES));
  batch.set(classRef, {
    name: input.name,
    courseId: input.courseId,
    subjectIds: input.subjectIds,
    teacherIds: input.teacherIds,
    studentIds: [],
    scheduleText: buildScheduleText(input.recurrence),
    location: input.location,
    status: input.status,
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

  sessions.forEach((session) => {
    const sessionRef = doc(collection(db, COLLECTIONS.SESSIONS));
    batch.set(sessionRef, {
      classId: classRef.id,
      title: input.name,
      startAt: Timestamp.fromDate(session.startAt),
      endAt: Timestamp.fromDate(session.endAt),
      location: input.location,
      status: "scheduled",
      note: "",
      makeUpForSessionId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return classRef.id;
}

/**
 * Khong dong studentIds tai day - viec ghi danh di qua services/firestore/enrollments.ts.
 * Khi Admin doi phan cong giao vien, cap nhat teacherIds tren cac hoc sinh cua
 * lop trong cung transaction de student scope va Messenger khong bi lech.
 */
export async function updateClass(classId: string, input: UpsertClassInput): Promise<void> {
  const actor = await getCurrentUserDoc();
  const shouldSyncStudents = isAdminUser(actor);
  await runTransaction(db, async (transaction) => {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classSnap = await transaction.get(classRef);
    if (!classSnap.exists()) throw new Error("class_not_found");

    const currentClass = classSnap.data() as ClassDoc;
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
  const batch = writeBatch(db);

  batch.update(doc(db, COLLECTIONS.CLASSES, classId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });

  const sessionsSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.SESSIONS),
      where("classId", "==", classId),
      where("startAt", ">=", Timestamp.fromDate(now)),
      orderBy("startAt"),
      limit(300),
    ),
  );

  sessionsSnap.docs.forEach((sessionDoc) => {
    batch.update(sessionDoc.ref, {
      status: "cancelled",
      note: "Lop hoc da duoc xoa mem.",
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/** Danh sach lop - Admin xem tat ca, Teacher chi xem lop duoc phan cong. */
export async function listClasses(): Promise<(ClassDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser) return [];

  if (!isAdminUser(currentUser) && !isTeacherUser(currentUser)) return [];

  const q = isTeacherUser(currentUser)
    ? query(collection(db, COLLECTIONS.CLASSES), where("teacherIds", "array-contains", currentUser.uid), limit(200))
    : query(collection(db, COLLECTIONS.CLASSES), orderBy("name"), limit(200));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ClassDoc) }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export async function getClass(classId: string): Promise<(ClassDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CLASSES, classId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as ClassDoc) };
}
