import {
  addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import type { FanpagePostDoc } from "@/types/chat";

export interface CreateFanpagePostInput {
  message: string;
  link: string | null;
  /** URL anh cong khai, toi da 4 - chi luu chuoi, khong luu file. */
  imageUrls: string[] | null;
  status: "sent" | "failed" | "scheduled";
  /** null neu dang ngay. */
  scheduledFor: Date | null;
  postId?: string | null;
  errorCode?: string | null;
}

/** Ghi 1 ban ghi fanpage_posts - dung cho ca "dang ngay" (da biet ket qua) lan "len lich" (status: scheduled). */
export async function createFanpagePost(input: CreateFanpagePostInput, actorUid: string, actorName: string): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.FANPAGE_POSTS), {
    message: input.message,
    link: input.link,
    imageUrls: input.imageUrls,
    status: input.status,
    scheduledFor: input.scheduledFor ? Timestamp.fromDate(input.scheduledFor) : null,
    actorUid,
    actorName,
    createdAt: serverTimestamp(),
    sentAt: input.status === "sent" ? serverTimestamp() : null,
    postId: input.postId ?? null,
    errorCode: input.errorCode ?? null,
  });
  return ref.id;
}

export async function listFanpagePosts(): Promise<Array<FanpagePostDoc & { id: string }>> {
  const q = query(collection(db, COLLECTIONS.FANPAGE_POSTS), orderBy("createdAt", "desc"), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as FanpagePostDoc) }));
}

/** Chuyen 1 bai dang cho (scheduled) sang sent/failed sau khi da thuc su goi postToPage(). */
export async function markFanpagePostResult(
  id: string,
  result: { status: "sent" | "failed"; postId?: string | null; errorCode?: string | null },
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.FANPAGE_POSTS, id), {
    status: result.status,
    postId: result.postId ?? null,
    errorCode: result.errorCode ?? null,
    sentAt: result.status === "sent" ? serverTimestamp() : null,
  });
}

export async function cancelScheduledFanpagePost(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.FANPAGE_POSTS, id), { status: "canceled" });
}
