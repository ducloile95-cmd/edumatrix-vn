import { formatInTimeZone } from "date-fns-tz";
import {
  collection, doc, getDocs, increment, limit, orderBy, query, runTransaction, serverTimestamp, where,
} from "firebase/firestore";
import { auth } from "@/services/firebase/authClient";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { FirestoreUsageDoc } from "@/types/settings";

export interface UsageDelta {
  collectionId: string;
  reads?: number;
  writes?: number;
  deletes?: number;
  latencyMs?: number;
}

export interface UsageSummary {
  reads: number;
  writes: number;
  deletes: number;
  latencyMs: number;
  byCollection: Array<{ collectionId: string; operations: number }>;
}

interface PendingUsage {
  reads: number;
  writes: number;
  deletes: number;
  latencyMs: number;
  lastFlushAt: number;
}

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const FLUSH_THRESHOLD = 25;
const flushesInFlight = new Set<string>();

function storageKey(uid: string, dateKey: string, collectionId: string) {
  return `edumatrix-usage:${uid}:${dateKey}:${collectionId}`;
}

function safeCollectionId(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60);
}

function readPending(key: string): PendingUsage {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as PendingUsage;
  } catch {
    // Trinh duyet chan localStorage: su dung bo dem rong va thu lai o lan sau.
  }
  return { reads: 0, writes: 0, deletes: 0, latencyMs: 0, lastFlushAt: 0 };
}

async function flushPending(uid: string, dateKey: string, collectionId: string, key: string, pending: PendingUsage) {
  if (pending.reads + pending.writes + pending.deletes === 0) return;
  const ref = doc(db, COLLECTIONS.USAGE_EVENTS, `${uid}_${dateKey}_${safeCollectionId(collectionId)}`);
  const counters = {
    reads: increment(pending.reads),
    writes: increment(pending.writes),
    deletes: increment(pending.deletes),
    lastLatencyMs: Math.max(0, Math.round(pending.latencyMs)),
    updatedAt: serverTimestamp(),
  };
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      transaction.update(ref, counters);
      return;
    }
    transaction.set(ref, {
      uid,
      dateKey,
      collectionId: safeCollectionId(collectionId),
      reads: pending.reads,
      writes: pending.writes,
      deletes: pending.deletes,
      lastLatencyMs: Math.max(0, Math.round(pending.latencyMs)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  const latest = readPending(key);
  const remaining: PendingUsage = {
    reads: Math.max(0, latest.reads - pending.reads),
    writes: Math.max(0, latest.writes - pending.writes),
    deletes: Math.max(0, latest.deletes - pending.deletes),
    latencyMs: latest.reads + latest.writes + latest.deletes > pending.reads + pending.writes + pending.deletes
      ? latest.latencyMs
      : 0,
    lastFlushAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(remaining));
}

/** Ghi usage uoc tinh theo lo, tranh tao mot Firestore write cho moi thao tac. */
export function recordFirestoreUsage(delta: UsageDelta): void {
  const uid = auth.currentUser?.uid;
  if (!uid || typeof localStorage === "undefined") return;
  const dateKey = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
  const collectionId = safeCollectionId(delta.collectionId);
  const key = storageKey(uid, dateKey, collectionId);
  const pending = readPending(key);
  pending.reads += Math.max(0, Math.round(delta.reads ?? 0));
  pending.writes += Math.max(0, Math.round(delta.writes ?? 0));
  pending.deletes += Math.max(0, Math.round(delta.deletes ?? 0));
  pending.latencyMs = Math.max(0, Math.round(delta.latencyMs ?? pending.latencyMs));
  localStorage.setItem(key, JSON.stringify(pending));
  const operations = pending.reads + pending.writes + pending.deletes;
  if ((operations >= FLUSH_THRESHOLD || Date.now() - pending.lastFlushAt >= FLUSH_INTERVAL_MS) && !flushesInFlight.has(key)) {
    flushesInFlight.add(key);
    void flushPending(uid, dateKey, collectionId, key, pending)
      .catch((error) => console.warn("usage rollup flush failed", error))
      .finally(() => flushesInFlight.delete(key));
  }
}

export async function listFirestoreUsage(days = 7): Promise<Array<FirestoreUsageDoc & { id: string }>> {
  const from = new Date();
  from.setDate(from.getDate() - Math.max(0, days - 1));
  const fromKey = formatInTimeZone(from, TIME_ZONE, "yyyy-MM-dd");
  const snap = await getDocs(query(
    collection(db, COLLECTIONS.USAGE_EVENTS),
    where("dateKey", ">=", fromKey),
    orderBy("dateKey", "desc"),
    limit(500),
  ));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as FirestoreUsageDoc) }));
}

export function summarizeUsage(records: Array<Pick<FirestoreUsageDoc, "reads" | "writes" | "deletes" | "lastLatencyMs" | "collectionId">>): UsageSummary {
  const byCollection = new Map<string, number>();
  let reads = 0;
  let writes = 0;
  let deletes = 0;
  let latencyTotal = 0;
  let latencyCount = 0;
  for (const record of records) {
    reads += record.reads;
    writes += record.writes;
    deletes += record.deletes;
    const operations = record.reads + record.writes + record.deletes;
    byCollection.set(record.collectionId, (byCollection.get(record.collectionId) ?? 0) + operations);
    if (record.lastLatencyMs > 0) {
      latencyTotal += record.lastLatencyMs;
      latencyCount += 1;
    }
  }
  return {
    reads,
    writes,
    deletes,
    latencyMs: latencyCount ? Math.round(latencyTotal / latencyCount) : 0,
    byCollection: [...byCollection.entries()]
      .map(([collectionId, operations]) => ({ collectionId, operations }))
      .sort((a, b) => b.operations - a.operations),
  };
}
