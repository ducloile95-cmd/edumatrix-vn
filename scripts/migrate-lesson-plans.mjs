// Resumable migration script for lesson plans to add new schema fields
// Batch size limited to 400.
// Usage (emulator only): FIRESTORE_EMULATOR_HOST=127.0.0.1:8091 node scripts/migrate-lesson-plans.mjs [--apply]
// Without --apply it only counts the documents it would change.

import { initializeApp } from "firebase/app";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from "firebase/firestore";

const apply = process.argv.includes("--apply");
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
// Client SDK voi API key gia: chi chay duoc tren emulator; tren production Rules se chan.
if (!emulatorHost) {
  console.error("Set FIRESTORE_EMULATOR_HOST (e.g. 127.0.0.1:8091). This script only runs against the emulator.");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID || "demo-edumatrix";
const app = initializeApp({ apiKey: "demo-key", projectId });
const db = getFirestore(app);
const [host, port] = emulatorHost.split(":");
connectFirestoreEmulator(db, host, Number(port));
console.log(`Project ${projectId} on emulator ${emulatorHost} (${apply ? "APPLY" : "dry run"})`);

async function runMigration() {
  const snapshot = await getDocs(collection(db, "lesson_plans"));
  console.log(`Found ${snapshot.docs.length} total lesson plan documents.`);

  let batch = writeBatch(db);
  let count = 0;
  let totalMigrated = 0;

  for (const snap of snapshot.docs) {
    const data = snap.data();
    if (data.readinessStatus !== undefined && data.curriculumItemId !== undefined) continue;
    totalMigrated++;
    if (!apply) continue;
    batch.update(doc(db, "lesson_plans", snap.id), {
      readinessStatus: data.readinessStatus !== undefined
        ? data.readinessStatus
        : (data.status === "published" ? "ready" : "draft"),
      curriculumItemId: data.curriculumItemId !== undefined ? data.curriculumItemId : null,
    });
    count++;
    if (count === 400) {
      console.log(`Writing batch of ${count} updates...`);
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    console.log(`Writing final batch of ${count} updates...`);
    await batch.commit();
  }

  console.log(apply
    ? `Migration finished. Updated ${totalMigrated} documents.`
    : `Dry run: ${totalMigrated} documents need migration. Re-run with --apply to write.`);
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
