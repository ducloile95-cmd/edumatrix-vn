import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeEmail } from "@/utils/email";
import { writeAuditLog } from "@/services/firestore/auditLog";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import type { InviteDoc, UserDoc, UserRole, UserStatus } from "@/types/user";

export type ClaimFailureReason = "email_not_verified" | "no_invite" | "error";

export type ClaimResult = { claimed: true } | { claimed: false; reason: ClaimFailureReason };

export interface ParentProfileInput {
  displayName?: string;
  address?: string;
  phone?: string;
  facebookUrl?: string;
}

/**
 * Thu claim tai khoan dua tren invite dang active (A16.4, Section 7).
 * Role/studentIds luon lay tu invite - nguoi dung khong duoc tu chon.
 * Batch 2 thao tac: tao users/{uid} + danh dau invites/{email} = claimed,
 * dong bo voi Firestore Rules (firebase/firestore.rules match /users/{uid}).
 */
export async function attemptClaimInvite(firebaseUser: User): Promise<ClaimResult> {
  if (!firebaseUser.email) {
    return { claimed: false, reason: "no_invite" };
  }
  if (!firebaseUser.emailVerified) {
    return { claimed: false, reason: "email_not_verified" };
  }

  const email = normalizeEmail(firebaseUser.email);
  const inviteRef = doc(db, COLLECTIONS.INVITES, email);

  try {
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      return { claimed: false, reason: "no_invite" };
    }
    const invite = inviteSnap.data() as InviteDoc;
    if (invite.status !== "active") {
      return { claimed: false, reason: "no_invite" };
    }

    const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
    const batch = writeBatch(db);

    batch.set(userRef, {
      email,
      displayName: firebaseUser.displayName ?? email,
      photoURL: firebaseUser.photoURL ?? null,
      role: invite.role,
      studentIds: invite.studentIds,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(inviteRef, {
      status: "claimed",
      claimedAt: serverTimestamp(),
    });

    await batch.commit();
    return { claimed: true };
  } catch (err) {
    console.error("attemptClaimInvite failed", err);
    return { claimed: false, reason: "error" };
  }
}

/** Danh sach tai khoan cho man hinh Admin - khong realtime, co limit (A14). */
export async function listUsers(): Promise<(UserDoc & { uid: string })[]> {
  const q = query(collection(db, COLLECTIONS.USERS), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as UserDoc) }));
}

export async function listUsersByIds(uids: string[]): Promise<(UserDoc & { uid: string })[]> {
  const uniqueIds = [...new Set(uids)].filter(Boolean);
  const groups: (UserDoc & { uid: string })[][] = [];

  for (let offset = 0; offset < uniqueIds.length; offset += 30) {
    const chunk = uniqueIds.slice(offset, offset + 30);
    if (chunk.length === 0) continue;
    const snap = await getDocs(query(collection(db, COLLECTIONS.USERS), where(documentId(), "in", chunk)));
    groups.push(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as UserDoc) })));
  }

  return groups.flat();
}

export async function updateParentProfile(uid: string, input: ParentProfileInput): Promise<void> {
  const payload: Record<string, string | ReturnType<typeof serverTimestamp>> = {
    updatedAt: serverTimestamp(),
  };
  if (input.displayName !== undefined) payload.displayName = input.displayName;
  if (input.address !== undefined) payload.address = input.address;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.facebookUrl !== undefined) payload.facebookUrl = input.facebookUrl;
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), payload);
}

/** Chi Admin duoc goi (Rules enforce). Khoa/mo tai khoan (A11, A26). */
export async function setUserStatus(actor: User, uid: string, status: UserStatus): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
  await writeAuditLog(actor, "user_status_changed", "user", uid, { status });
}

/** Danh sach tai khoan active theo role - dung de chon Giao vien khi tao/sua lop (Phase 3). */
export async function listUsersByRole(role: UserRole): Promise<(UserDoc & { uid: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser) return [];

  if (!isAdminUser(currentUser)) {
    if (isTeacherUser(currentUser) && role === currentUser.role && currentUser.status === "active") {
      return [currentUser];
    }
    return [];
  }

  const q = query(
    collection(db, COLLECTIONS.USERS),
    where("role", "==", role),
    where("status", "==", "active"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as UserDoc) }));
}
