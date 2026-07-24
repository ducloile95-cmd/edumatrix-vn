import {
  collection, getDocs, limit, onSnapshot, orderBy, query, where, type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import type { ChatMessageDoc, ChatThreadDoc, MessageOutboxDoc } from "@/types/chat";
import type { UserRole } from "@/types/user";

export async function listChatThreads(role: UserRole, uid: string): Promise<Array<ChatThreadDoc & { id: string }>> {
  const source = collection(db, COLLECTIONS.CHAT_THREADS);
  const q = role === "admin"
    ? query(source, orderBy("lastMessageAt", "desc"), limit(30))
    : query(source, where("assignedTeacherIds", "array-contains", uid), orderBy("lastMessageAt", "desc"), limit(30));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ChatThreadDoc) }));
}

export function subscribeChatThreads(role: UserRole, uid: string, listener: (items: Array<ChatThreadDoc & { id: string }>) => void, onError: (error: Error) => void): Unsubscribe {
  const source = collection(db, COLLECTIONS.CHAT_THREADS);
  const q = role === "admin"
    ? query(source, orderBy("lastMessageAt", "desc"), limit(30))
    : query(source, where("assignedTeacherIds", "array-contains", uid), orderBy("lastMessageAt", "desc"), limit(30));
  return onSnapshot(q, (snapshot) => {
    listener(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ChatThreadDoc) })));
  }, onError);
}

export function subscribeChatMessages(threadId: string, listener: (items: Array<ChatMessageDoc & { id: string }>) => void, onError: (error: Error) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.CHAT_THREADS, threadId, "messages"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    listener(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ChatMessageDoc) })).reverse());
  }, onError);
}

export async function listMessageOutbox(role: UserRole, uid: string): Promise<Array<MessageOutboxDoc & { id: string }>> {
  const source = collection(db, COLLECTIONS.MESSAGE_OUTBOX);
  const q = role === "admin"
    ? query(source, orderBy("createdAt", "desc"), limit(50))
    : query(source, where("actorUid", "==", uid), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...(item.data() as MessageOutboxDoc) }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

function timestampMillis(value: MessageOutboxDoc["createdAt"]): number {
  return typeof value === "string" ? Date.parse(value) || 0 : value?.toMillis?.() ?? 0;
}
