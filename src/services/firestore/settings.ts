import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { SETTINGS_DOC } from "@/constants/collections";
import { writeAuditLog } from "@/services/firestore/auditLog";
import type { SchoolSettingsDoc } from "@/types/settings";

export type SchoolSettingsInput = Omit<SchoolSettingsDoc, "updatedAt">;

/** Chi Admin doc duoc (Rules: settings/{docId} allow read, write: if isAdmin()). */
export async function getSchoolSettings(): Promise<SchoolSettingsDoc | null> {
  const snap = await getDoc(doc(db, SETTINGS_DOC.GENERAL));
  return snap.exists() ? (snap.data() as SchoolSettingsDoc) : null;
}

/** Chi Admin duoc goi (Rules enforce). Dung set({merge:true}) vi doc co the chua ton tai lan dau. */
export async function updateSchoolSettings(actor: User, input: SchoolSettingsInput): Promise<void> {
  await setDoc(
    doc(db, SETTINGS_DOC.GENERAL),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
  await writeAuditLog(actor, "settings_updated", "settings", "general");
}
