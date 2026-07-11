import {
  collection,
  doc,
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
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeEmail } from "@/utils/email";
import { writeAuditLog } from "@/services/firestore/auditLog";
import type { InviteDoc, UserDoc, UserRole, UserStatus } from "@/types/user";

export type ClaimFailureReason = "email_not_verified" | "no_invite" | "error";

export type ClaimResult = { claimed: true } | { claimed: false; reason: ClaimFailureReason };

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

/** Chi Admin duoc goi (Rules enforce). Khoa/mo tai khoan (A11, A26). */
export async function setUserStatus(actor: User, uid: string, status: UserStatus): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
  await writeAuditLog(actor, "user_status_changed", "user", uid, { status });
}

/** Danh sach tai khoan active theo role - dung de chon Giao vien khi tao/sua lop (Phase 3). */
export async function listUsersByRole(role: UserRole): Promise<(UserDoc & { uid: string })[]> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where("role", "==", role),
    where("status", "==", "active"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as UserDoc) }));
}
