import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { SessionDoc, SessionStatus } from "@/types/academic";

export interface CreateSessionsInput {
  classId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location: string;
  note: string;
  repeatCount: number;
  makeUpForSessionId: string | null;
}

export async function createSessions(input: CreateSessionsInput): Promise<void> {
  const batch = writeBatch(db);
  for (let index = 0; index < input.repeatCount; index += 1) {
    const offset = index * 7 * 24 * 60 * 60 * 1000;
    const ref = doc(collection(db, COLLECTIONS.SESSIONS));
    batch.set(ref, {
      classId: input.classId,
      title: input.title,
      startAt: Timestamp.fromDate(new Date(input.startAt.getTime() + offset)),
      endAt: Timestamp.fromDate(new Date(input.endAt.getTime() + offset)),
      location: input.location,
      status: "scheduled",
      note: input.note,
      makeUpForSessionId: input.makeUpForSessionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function listSessions(from: Date, to: Date): Promise<(SessionDoc & { id: string })[]> {
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
export async function listSessionsByClass(classId:string,from:Date,to:Date):Promise<(SessionDoc&{id:string})[]>{const q=query(collection(db,COLLECTIONS.SESSIONS),where("classId","==",classId),where("startAt",">=",Timestamp.fromDate(from)),where("startAt","<=",Timestamp.fromDate(to)),orderBy("startAt"),limit(100));const snap=await getDocs(q);return snap.docs.map(i=>({id:i.id,...(i.data()as SessionDoc)}));}

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
  await updateDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), payload);

  if (changes.status === "cancelled" || changes.status === "rescheduled") {
    await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), {
      type: "schedule_change",
      sessionId,
      title: changes.status === "cancelled" ? "Buổi học đã hủy" : "Lịch học đã thay đổi",
      message: changes.note || "Vui lòng kiểm tra lịch học mới.",
      createdAt: serverTimestamp(),
    });
  }
}
