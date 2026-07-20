import { doc, getDoc } from "firebase/firestore";
import { USER_ROLES } from "@/constants/roles";
import { auth } from "@/services/firebase/authClient";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { UserDoc } from "@/types/user";

export type CurrentUserDoc = UserDoc & { uid: string };

let cachedUserDoc: CurrentUserDoc | null = null;

/**
 * AuthContext day snapshot realtime users/{uid} vao day de cac ham service
 * khong phai getDoc lai document nay moi lan xac dinh role - tiet kiem quota
 * doc Spark (A14). Cache tu cap nhat theo onSnapshot, xoa khi doi/mat user.
 */
export function setCachedUserDoc(value: CurrentUserDoc | null): void {
  cachedUserDoc = value;
}

export async function getCurrentUserDoc(): Promise<CurrentUserDoc | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  if (cachedUserDoc?.uid === currentUser.uid) return cachedUserDoc;

  const snap = await getDoc(doc(db, COLLECTIONS.USERS, currentUser.uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as UserDoc) };
}

export function isAdminUser(user: CurrentUserDoc | null): boolean {
  return user?.role === USER_ROLES.ADMIN;
}

export function isTeacherUser(user: CurrentUserDoc | null): boolean {
  return user?.role === USER_ROLES.TEACHER;
}
