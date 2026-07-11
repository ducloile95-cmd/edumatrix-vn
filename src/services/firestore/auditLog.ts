import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { AuditAction } from "@/types/audit";
import type { User } from "firebase/auth";

/**
 * Ghi audit log cho thao tac nhay cam (A26). Khong throw ra ngoai - neu ghi
 * log loi thi khong duoc chan thao tac chinh, chi log ra console.
 */
export async function writeAuditLog(
  actor: User,
  action: AuditAction,
  targetType: "invite" | "user",
  targetId: string,
  meta?: Record<string, string>,
): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
      action,
      actorUid: actor.uid,
      actorEmail: actor.email ?? "",
      targetType,
      targetId,
      meta: meta ?? {},
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("writeAuditLog failed", err);
  }
}
