import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { SETTINGS_DOC } from "@/constants/collections";
import { writeAuditLog } from "@/services/firestore/auditLog";
import type { AcademicSettingsDoc, IntegrationSettingsDoc, PaymentSettingsDoc, SchoolSettingsDoc } from "@/types/settings";
import { DEFAULT_RANK_THRESHOLDS, isValidRankThresholds } from "@/utils/ranking";

export type SchoolSettingsInput = Omit<SchoolSettingsDoc, "updatedAt">;
export type IntegrationSettingsInput = Omit<IntegrationSettingsDoc, "updatedAt">;
export type PaymentSettingsInput = Omit<PaymentSettingsDoc, "updatedAt">;
export type AcademicSettingsInput = Omit<AcademicSettingsDoc, "updatedAt">;

export async function getAcademicSettings(): Promise<AcademicSettingsDoc> {
  const snap = await getDoc(doc(db, SETTINGS_DOC.ACADEMIC));
  return snap.exists()
    ? (snap.data() as AcademicSettingsDoc)
    : { rankThresholds: DEFAULT_RANK_THRESHOLDS, updatedAt: null };
}

export async function updateAcademicSettings(actor: User, input: AcademicSettingsInput): Promise<void> {
  if (!isValidRankThresholds(input.rankThresholds)) throw new Error("RANK_THRESHOLDS_INVALID");
  await setDoc(doc(db, SETTINGS_DOC.ACADEMIC), { ...input, updatedAt: serverTimestamp() });
  await writeAuditLog(actor, "settings_updated", "settings", "academic");
}

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

export async function getIntegrationSettings(): Promise<IntegrationSettingsDoc | null> {
  const snap = await getDoc(doc(db, SETTINGS_DOC.INTEGRATIONS));
  return snap.exists() ? (snap.data() as IntegrationSettingsDoc) : null;
}

export async function updateIntegrationSettings(actor: User, input: IntegrationSettingsInput): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC.INTEGRATIONS), { ...input, updatedAt: serverTimestamp() }, { merge: true });
  await writeAuditLog(actor, "settings_updated", "settings", "integrations");
}

export async function getPaymentSettings(): Promise<PaymentSettingsDoc | null> {
  const snap = await getDoc(doc(db, SETTINGS_DOC.PAYMENT));
  return snap.exists() ? (snap.data() as PaymentSettingsDoc) : null;
}

export async function updatePaymentSettings(actor: User, input: PaymentSettingsInput): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC.PAYMENT), { ...input, updatedAt: serverTimestamp() }, { merge: true });
  await writeAuditLog(actor, "settings_updated", "settings", "payment");
}
