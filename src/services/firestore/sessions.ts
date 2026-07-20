import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import type { SessionDoc, SessionStatus } from "@/types/academic";

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
  const batch = writeBatch(db);
  input.occurrences.forEach((occurrence) => {
    const ref = doc(collection(db, COLLECTIONS.SESSIONS));
    batch.set(ref, {
      classId: input.classId,
      title: input.title,
      startAt: Timestamp.fromDate(occurrence.startAt),
      endAt: Timestamp.fromDate(occurrence.endAt),
      location: input.location,
      status: "scheduled",
      note: input.note,
      makeUpForSessionId: input.makeUpForSessionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function listSessions(from: Date, to: Date): Promise<(SessionDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser) return [];

  if (isTeacherUser(currentUser)) {
    const classes = await listClasses();
    const groups = await Promise.all(classes.map((klass) => listSessionsByClass(klass.id, from, to, 100)));
    return groups.flat().sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis()).slice(0, 300);
  }

  if (!isAdminUser(currentUser)) return [];

  const q = query(
    collection(db, COLLECTIONS.SESSIONS),
    where("startAt", ">=", Timestamp.fromDate(from)),
    where("startAt", "<=", Timestamp.fromDate(to)),
    orderBy("startAt"),
    limit(300),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as SessionDoc) }));
}

export async function getSession(sessionId: string): Promise<(SessionDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.SESSIONS, sessionId));
  return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as SessionDoc) } : null;
}
export async function listSessionsByClass(classId:string,from:Date,to:Date,pageSize=100):Promise<(SessionDoc&{id:string})[]>{const q=query(collection(db,COLLECTIONS.SESSIONS),where("classId","==",classId),where("startAt",">=",Timestamp.fromDate(from)),where("startAt","<=",Timestamp.fromDate(to)),orderBy("startAt"),limit(pageSize));const snap=await getDocs(q);return snap.docs.map(i=>({id:i.id,...(i.data()as SessionDoc)}));}

export async function updateSession(
  sessionId: string,
  changes: { startAt?: Date; endAt?: Date; status?: SessionStatus; location?: string; note?: string },
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (changes.startAt) payload.startAt = Timestamp.fromDate(changes.startAt);
  if (changes.endAt) payload.endAt = Timestamp.fromDate(changes.endAt);
  if (changes.status) payload.status = changes.status;
  if (changes.location !== undefined) payload.location = changes.location;
  if (changes.note !== undefined) payload.note = changes.note;
  const shouldAnnounce = changes.status === "cancelled" || changes.status === "rescheduled";
  const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
  const sessionSnap = shouldAnnounce ? await getDoc(sessionRef) : null;
  const currentSession = sessionSnap?.exists() ? (sessionSnap.data() as SessionDoc) : null;
  if (shouldAnnounce && !currentSession) throw new Error("SESSION_NOT_FOUND");

  const batch = writeBatch(db);
  batch.update(sessionRef, payload);
  if (shouldAnnounce) {
    batch.set(doc(collection(db, COLLECTIONS.ANNOUNCEMENTS)), {
      type: "schedule_change",
      sessionId,
      classId: currentSession?.classId,
      title: changes.status === "cancelled" ? "Buổi học đã hủy" : "Lịch học đã thay đổi",
      message: changes.note || "Vui lòng kiểm tra lịch học mới.",
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}
