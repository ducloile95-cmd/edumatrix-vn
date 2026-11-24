import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { AuditAction } from "@/types/audit";
import type { User } from "firebase/auth";

/** Ghi audit append-only. Lỗi được trả về để caller không báo thành công giả. */
export async function writeAuditLog(
  actor: User,
  action: AuditAction,
  targetType: "invite" | "user" | "settings" | "attendance_session" | "gradebook",
  targetId: string,
  meta?: Record<string, string>,
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
    action,
    actorUid: actor.uid,
    actorEmail: actor.email ?? "",
    targetType,
    targetId,
    meta: meta ?? {},
    createdAt: serverTimestamp(),
  });
}
