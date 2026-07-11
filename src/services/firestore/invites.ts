import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeEmail } from "@/utils/email";
import { writeAuditLog } from "@/services/firestore/auditLog";
import type { InviteDoc } from "@/types/user";
import type { UserRole } from "@/types/user";

export interface CreateInviteInput {
  email: string;
  role: UserRole;
  studentIds: string[];
}

/**
 * Tao/ghi de loi moi voi ID xac dinh = email chuan hoa (A13) - khong can
 * query kiem tra ton tai truoc.
 */
export async function createInvite(actor: User, input: CreateInviteInput): Promise<void> {
  const email = normalizeEmail(input.email);
  const ref = doc(db, COLLECTIONS.INVITES, email);

  await setDoc(ref, {
    email,
    role: input.role,
    studentIds: input.studentIds,
    status: "active",
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
  });

  await writeAuditLog(actor, "invite_created", "invite", email, { role: input.role });
}

export async function revokeInvite(actor: User, email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const ref = doc(db, COLLECTIONS.INVITES, normalized);
  await updateDoc(ref, { status: "revoked" });
  await writeAuditLog(actor, "invite_revoked", "invite", normalized);
}

/** Danh sach loi moi cho man hinh Admin - khong realtime, co limit (A14). */
export async function listInvites(): Promise<InviteDoc[]> {
  const q = query(collection(db, COLLECTIONS.INVITES), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as InviteDoc);
}
