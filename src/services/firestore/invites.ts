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
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeEmail } from "@/utils/email";
import { writeAuditLog } from "@/services/firestore/auditLog";
import type { InviteDoc } from "@/types/user";
import type { UserRole } from "@/types/user";
import { listAllQueryDocuments } from "@/services/firestore/pagination";

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
  const existingUsers = await getDocs(query(
    collection(db, COLLECTIONS.USERS),
    where("email", "==", email),
    limit(1),
  ));
  if (!existingUsers.empty) throw new Error("ACCOUNT_ALREADY_EXISTS");
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

export async function listInvites(): Promise<InviteDoc[]> {
  const documents = await listAllQueryDocuments(
    COLLECTIONS.INVITES,
    [orderBy("createdAt", "desc")],
    100,
  );
  return documents.map((d) => d.data() as InviteDoc);
}
