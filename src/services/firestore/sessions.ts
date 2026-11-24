import {
  Timestamp,
  collection,
  doc,
  getDoc,
  orderBy,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import type { ClassDoc, CourseDoc, SessionDoc, SessionStatus } from "@/types/academic";
import { decodeSessionDoc } from "@/services/firestore/decoders";
import { listAllQueryDocuments } from "@/services/firestore/pagination";
import { queueUtilityDeliveryEvent } from "@/services/firestore/messengerDelivery";

export interface CreateSessionsInput {
  classId: string;
  title: string;
  occurrences: Array<{ startAt: Date; endAt: Date }>;
  location: string;
  note: string;
  makeUpForSessionId: string | null;
}

export async function createSessions(input: CreateSessionsInput): Promise<void> {
  if (input.occurrences.length < 1 || input.occurrences.length > 200) throw new Error("INVALID_SESSION_COUNT");
  await runTransaction(db, async (transaction) => {
    const classSnap = await transaction.get(doc(db, COLLECTIONS.CLASSES, input.classId));
    const classData = classSnap.exists() ? (classSnap.data() as ClassDoc) : null;
    if (!classData || classData.status !== "active") throw new Error("CLASS_NOT_SCHEDULABLE");
    const [courseSnap, originalSnap] = await Promise.all([
      transaction.get(doc(db, COLLECTIONS.COURSES, classData.courseId)),
      input.makeUpForSessionId
        ? transaction.get(doc(db, COLLECTIONS.SESSIONS, input.makeUpForSessionId))
        : Promise.resolve(null),
    ]);
    if (!courseSnap.exists() || (courseSnap.data() as CourseDoc).status !== "active") throw new Error("COURSE_NOT_SCHEDULABLE");
    if (input.makeUpForSessionId && !originalSnap?.exists()) throw new Error("MAKE_UP_SESSION_NOT_FOUND");
    const original = originalSnap?.exists() ? originalSnap.data() as SessionDoc : null;
    if (original && original.classId !== input.classId) throw new Error("MAKE_UP_SESSION_CLASS_MISMATCH");

    input.occurrences.forEach((occurrence) => {
      const ref = doc(collection(db, COLLECTIONS.SESSIONS));
      transaction.set(ref, {
        classId: input.classId,
        title: input.title,
        startAt: Timestamp.fromDate(occurrence.startAt),
        endAt: Timestamp.fromDate(occurrence.endAt),
        location: input.location,
        status: "scheduled",
        note: input.note,
        makeUpForSessionId: input.makeUpForSessionId,
        sequenceNumber: original?.sequenceNumber ?? null,
        curriculumVersion: original?.curriculumVersion ?? classData.curriculumVersion ?? null,
        curriculumItemId: original?.curriculumItemId ?? null,
        lessonPlanId: null,
        scheduleVersion: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  });
}

export async function listSessions(from: Date, to: Date): Promise<(SessionDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser) return [];

  if (isTeacherUser(currentUser)) {
    const classes = await listClasses();
    const visibleClasses = classes.filter((klass) => klass.status !== "cancelled");
    const groups = await Promise.all(visibleClasses.map((klass) => listSessionsByClass(klass.id, from, to, 300)));
    return groups.flat().sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  }

  if (!isAdminUser(currentUser)) return [];
  const visibleClassIds = new Set((await listClasses()).filter((klass) => klass.status !== "cancelled").map((klass) => klass.id));

  const documents = await listAllQueryDocuments(
    COLLECTIONS.SESSIONS,
    [
      where("startAt", ">=", Timestamp.fromDate(from)),
      where("startAt", "<=", Timestamp.fromDate(to)),
      orderBy("startAt"),
    ],
    300,
  );
  return documents
    .map((item) => ({
      id: item.id,
      ...decodeSessionDoc(item.data(), `${COLLECTIONS.SESSIONS}/${item.id}`),
    }))
    .filter((session) => visibleClassIds.has(session.classId));
}

export async function getSession(sessionId: string): Promise<(SessionDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.SESSIONS, sessionId));
  return snapshot.exists() ? {
    id: snapshot.id,
    ...decodeSessionDoc(snapshot.data(), `${COLLECTIONS.SESSIONS}/${snapshot.id}`),
  } : null;
}
export async function listSessionsByClass(
  classId: string,
  from: Date,
  to: Date,
  pageSize = 100,
): Promise<Array<SessionDoc & { id: string }>> {
  const documents = await listAllQueryDocuments(
    COLLECTIONS.SESSIONS,
    [
      where("classId", "==", classId),
      where("startAt", ">=", Timestamp.fromDate(from)),
      where("startAt", "<=", Timestamp.fromDate(to)),
      orderBy("startAt"),
    ],
    pageSize,
  );
  return documents.map((item) => ({ id: item.id, ...(item.data() as SessionDoc) }));
}

export async function updateSession(
  sessionId: string,
  changes: { startAt?: Date; endAt?: Date; status?: SessionStatus; location?: string; note?: string },
  actorUid: string,
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (changes.startAt) payload.startAt = Timestamp.fromDate(changes.startAt);
  if (changes.endAt) payload.endAt = Timestamp.fromDate(changes.endAt);
  if (changes.status) payload.status = changes.status;
  if (changes.location !== undefined) payload.location = changes.location;
  if (changes.note !== undefined) payload.note = changes.note;
  const shouldAnnounce = changes.status === "cancelled" || changes.status === "rescheduled";
  const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
  if (!shouldAnnounce) {
    const batch = writeBatch(db);
    batch.update(sessionRef, payload);
    await batch.commit();
    return;
  }

  let announcementClassId = "";
  let announcementStudentIds: string[] = [];
  await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists()) throw new Error("SESSION_NOT_FOUND");
    const currentSession = sessionSnap.data() as SessionDoc;
    const classSnap = await transaction.get(doc(db, COLLECTIONS.CLASSES, currentSession.classId));
    if (!classSnap.exists()) throw new Error("CLASS_NOT_FOUND");
    const studentIds = [...new Set((classSnap.data() as ClassDoc).studentIds)].filter(Boolean);
    announcementClassId = currentSession.classId;
    announcementStudentIds = studentIds;
    const timeChanged = changes.status === "rescheduled" && (
      (changes.startAt !== undefined && currentSession.startAt.toMillis() !== changes.startAt.getTime()) ||
      (changes.endAt !== undefined && currentSession.endAt.toMillis() !== changes.endAt.getTime())
    );
    const newlyCancelled = changes.status === "cancelled" && currentSession.status !== "cancelled";
    const shouldQueueUtility = timeChanged || newlyCancelled;
    if (studentIds.length > (shouldQueueUtility ? 249 : 498)) throw new Error("SESSION_ANNOUNCEMENT_RECIPIENT_LIMIT");
    const nextScheduleVersion = Number(currentSession.scheduleVersion ?? 0) + 1;
    if (shouldQueueUtility) payload.scheduleVersion = nextScheduleVersion;

    transaction.update(sessionRef, payload);
    for (const studentId of studentIds) {
      const announcementId = `schedule_${sessionId}_${studentId}`;
      if (shouldQueueUtility) {
        queueUtilityDeliveryEvent(transaction, {
          eventType: "session_schedule_changed",
          entityId: announcementId,
          sourceId: sessionId,
          studentId,
          version: nextScheduleVersion,
          actorUid,
        });
      }
    }
  });

  // Tach thong bao noi bo khoi transaction lich + Utility de khong vuot gioi han
  // document-access cua Rules khi cung mot buoi duoc doi lich nhieu lan.
  const announcementBatch = writeBatch(db);
  for (const studentId of announcementStudentIds) {
    announcementBatch.set(doc(db, COLLECTIONS.ANNOUNCEMENTS, `schedule_${sessionId}_${studentId}`), {
      type: "schedule_change",
      sessionId,
      classId: announcementClassId,
      studentId,
      title: changes.status === "cancelled" ? "Buổi học đã hủy" : "Lịch học đã thay đổi",
      message: changes.note || (changes.status === "cancelled" ? "Buổi học đã hủy." : "Vui lòng kiểm tra lịch học mới."),
      createdAt: serverTimestamp(),
      resolvedAt: null,
    });
  }
  await announcementBatch.commit();
}
