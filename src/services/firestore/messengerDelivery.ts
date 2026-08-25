import { doc, serverTimestamp, type Transaction, type WriteBatch } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";

export type UtilityDeliveryEventType =
  | "lesson_feedback_published"
  | "invoice_committed"
  | "payment_verified"
  | "enrollment_completed"
  | "session_schedule_changed";

interface UtilityDeliveryEventInput {
  eventType: UtilityDeliveryEventType;
  entityId: string;
  sourceId: string;
  studentId: string;
  version: number;
  actorUid: string;
}

type FirestoreWriter = Pick<Transaction, "set"> | Pick<WriteBatch, "set">;

export function utilityDeliveryEventId(input: Pick<UtilityDeliveryEventInput, "eventType" | "entityId" | "version">): string {
  if (!/^[A-Za-z0-9_-]{1,300}$/.test(input.entityId) || !Number.isInteger(input.version) || input.version < 1) {
    throw new Error("UTILITY_DELIVERY_EVENT_INVALID");
  }
  return `${input.eventType}:${input.entityId}:v${input.version}`;
}

/**
 * Transactional event intent. The client may create this immutable marker only
 * inside the business write; the Worker validates it and creates server-only jobs.
 */
export function queueUtilityDeliveryEvent(writer: FirestoreWriter, input: UtilityDeliveryEventInput): void {
  const id = utilityDeliveryEventId(input);
  (writer as Transaction).set(doc(db, COLLECTIONS.MESSENGER_DELIVERY_EVENTS, id), {
    ...input,
    idempotencyKey: id,
    status: "pending",
    attempts: 0,
    lastErrorCode: null,
    leaseUntil: null,
    nextAttemptAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
