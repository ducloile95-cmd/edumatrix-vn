import {
  addDoc, arrayRemove, collection, deleteDoc, doc, documentId, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, startAfter, updateDoc, where, writeBatch, type Timestamp, type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import type { ChatMessageDoc, ChatTagColor, ChatTagDoc, ChatThreadDoc } from "@/types/chat";
import type { UserRole } from "@/types/user";

export async function listChatThreads(role: UserRole, uid: string): Promise<Array<ChatThreadDoc & { id: string }>> {
  const source = collection(db, COLLECTIONS.CHAT_THREADS);
  const q = role === "admin"
    ? query(source, orderBy("lastMessageAt", "desc"), limit(50))
    : query(source, where("assignedTeacherIds", "array-contains", uid), orderBy("lastMessageAt", "desc"), limit(50));
  const documents = await getDocs(q);
  return documents.docs.map((item) => ({ id: item.id, ...(item.data() as ChatThreadDoc) }))
    .filter((item) => item.deletionState !== "deleting" && item.deletionState !== "deleted");
}

export function subscribeChatThreads(role: UserRole, uid: string, listener: (items: Array<ChatThreadDoc & { id: string }>) => void, onError: (error: Error) => void): Unsubscribe {
  const source = collection(db, COLLECTIONS.CHAT_THREADS);
  const q = role === "admin"
    ? query(source, orderBy("lastMessageAt", "desc"), limit(50))
    : query(source, where("assignedTeacherIds", "array-contains", uid), orderBy("lastMessageAt", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ChatThreadDoc) }))
      .filter((item) => item.deletionState !== "deleting" && item.deletionState !== "deleted");
    listener([...new Map(items.map((item) => [item.id, item])).values()]);
  }, onError);
}

export async function loadOlderMessages(threadId: string, before: Timestamp, pageSize = 50): Promise<Array<ChatMessageDoc & { id: string }>> {
  const q = query(
    collection(db, COLLECTIONS.CHAT_THREADS, threadId, "messages"),
    orderBy("createdAt", "desc"),
    startAfter(before),
    limit(Math.min(Math.max(pageSize, 1), 50)),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ChatMessageDoc) })).reverse();
}

export function subscribeChatMessages(threadId: string, listener: (items: Array<ChatMessageDoc & { id: string }>) => void, onError: (error: Error) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.CHAT_THREADS, threadId, "messages"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    listener(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ChatMessageDoc) })).reverse());
  }, onError);
}

export async function listChatTags(): Promise<Array<ChatTagDoc & { id: string }>> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.CHAT_TAGS), orderBy("createdAt", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ChatTagDoc) }));
}

export async function createChatTag(label: string, color: ChatTagColor, actorUid: string) {
  return addDoc(collection(db, COLLECTIONS.CHAT_TAGS), {
    label: label.trim(), color, createdBy: actorUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function deleteChatTag(tagId: string) {
  while (true) {
    const threads = await getDocs(query(
      collection(db, COLLECTIONS.CHAT_THREADS),
      where("tagIds", "array-contains", tagId),
      limit(499),
    ));
    if (threads.empty) break;
    const batch = writeBatch(db);
    threads.docs.forEach((thread) => batch.update(thread.ref, {
      tagIds: arrayRemove(tagId),
      updatedAt: serverTimestamp(),
    }));
    await batch.commit();
  }
  await deleteDoc(doc(db, COLLECTIONS.CHAT_TAGS, tagId));
}

export async function setChatThreadTags(threadId: string, tagIds: string[]) {
  const uniqueTagIds = [...new Set(tagIds)].filter(Boolean);
  if (uniqueTagIds.length > 10) throw new Error("CHAT_TAG_LIMIT");
  if (uniqueTagIds.length > 0) {
    const tags = await getDocs(query(
      collection(db, COLLECTIONS.CHAT_TAGS),
      where(documentId(), "in", uniqueTagIds),
    ));
    if (tags.size !== uniqueTagIds.length) throw new Error("CHAT_TAG_NOT_FOUND");
  }
  await updateDoc(doc(db, COLLECTIONS.CHAT_THREADS, threadId), { tagIds: uniqueTagIds, updatedAt: serverTimestamp() });
}

export async function markChatThreadRead(threadId: string) {
  await updateDoc(doc(db, COLLECTIONS.CHAT_THREADS, threadId), {
    unreadStaffCount: 0,
    updatedAt: serverTimestamp(),
  });
}
