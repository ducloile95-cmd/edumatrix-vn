import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { SETTINGS_DOC } from "@/constants/collections";
import { writeAuditLog } from "@/services/firestore/auditLog";
import { recordFirestoreUsage } from "@/services/firestore/usage";
import type { IntegrationSettingsDoc, PaymentSettingsDoc, SchoolSettingsDoc } from "@/types/settings";

export type SchoolSettingsInput = Omit<SchoolSettingsDoc, "updatedAt">;
export type IntegrationSettingsInput = Omit<IntegrationSettingsDoc, "updatedAt">;
export type PaymentSettingsInput = Omit<PaymentSettingsDoc, "updatedAt">;

/** Chi Admin doc duoc (Rules: settings/{docId} allow read, write: if isAdmin()). */
export async function getSchoolSettings(): Promise<SchoolSettingsDoc | null> {
  const startedAt = performance.now();
  const snap = await getDoc(doc(db, SETTINGS_DOC.GENERAL));
  recordFirestoreUsage({ collectionId: "settings", reads: 1, latencyMs: performance.now() - startedAt });
  return snap.exists() ? (snap.data() as SchoolSettingsDoc) : null;
}

/** Chi Admin duoc goi (Rules enforce). Dung set({merge:true}) vi doc co the chua ton tai lan dau. */
export async function updateSchoolSettings(actor: User, input: SchoolSettingsInput): Promise<void> {
  await setDoc(
    doc(db, SETTINGS_DOC.GENERAL),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
  recordFirestoreUsage({ collectionId: "settings", writes: 1 });
  await writeAuditLog(actor, "settings_updated", "settings", "general");
}

export async function getIntegrationSettings(): Promise<IntegrationSettingsDoc | null> {
  const startedAt = performance.now();
  const snap = await getDoc(doc(db, SETTINGS_DOC.INTEGRATIONS));
  recordFirestoreUsage({ collectionId: "settings", reads: 1, latencyMs: performance.now() - startedAt });
  return snap.exists() ? (snap.data() as IntegrationSettingsDoc) : null;
}

export async function updateIntegrationSettings(actor: User, input: IntegrationSettingsInput): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC.INTEGRATIONS), { ...input, updatedAt: serverTimestamp() }, { merge: true });
  recordFirestoreUsage({ collectionId: "settings", writes: 1 });
  await writeAuditLog(actor, "settings_updated", "settings", "integrations");
}

export async function getPaymentSettings(): Promise<PaymentSettingsDoc | null> {
  const startedAt = performance.now();
  const snap = await getDoc(doc(db, SETTINGS_DOC.PAYMENT));
  recordFirestoreUsage({ collectionId: "settings", reads: 1, latencyMs: performance.now() - startedAt });
  return snap.exists() ? (snap.data() as PaymentSettingsDoc) : null;
}

export async function updatePaymentSettings(actor: User, input: PaymentSettingsInput): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC.PAYMENT), { ...input, updatedAt: serverTimestamp() }, { merge: true });
  recordFirestoreUsage({ collectionId: "settings", writes: 1 });
  await writeAuditLog(actor, "settings_updated", "settings", "payment");
}
