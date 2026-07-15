import { doc, getDoc } from "firebase/firestore";
import { USER_ROLES } from "@/constants/roles";
import { auth } from "@/services/firebase/authClient";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { UserDoc } from "@/types/user";

export type CurrentUserDoc = UserDoc & { uid: string };

export async function getCurrentUserDoc(): Promise<CurrentUserDoc | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

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
