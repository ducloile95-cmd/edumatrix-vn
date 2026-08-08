// Resumable migration script for lesson plans to add new schema fields
// Batch size limited to 400.
// Usage: node scripts/migrate-lesson-plans.mjs

import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from "firebase/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || "demo-edumatrix";
const app = initializeApp({ apiKey: "demo-key", projectId });
const db = getFirestore(app);

// Use emulator if host is defined in env
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`Connecting to firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

async function runMigration() {
  console.log("Starting lesson plans migration...");
  const snapshot = await getDocs(collection(db, "lesson_plans"));
  console.log(`Found ${snapshot.docs.length} total lesson plan documents.`);

  let batch = writeBatch(db);
  let count = 0;
  let totalMigrated = 0;

  for (const snap of snapshot.docs) {
    const data = snap.data();
    // Check if fields are missing
    if (data.readinessStatus === undefined || data.curriculumItemId === undefined) {
      batch.update(doc(db, "lesson_plans", snap.id), {
        readinessStatus: data.readinessStatus !== undefined 
          ? data.readinessStatus 
          : (data.status === "published" ? "ready" : "draft"),
        curriculumItemId: data.curriculumItemId !== undefined ? data.curriculumItemId : null,
      });
      count++;
      totalMigrated++;

      if (count === 400) {
        console.log(`Writing batch of ${count} updates...`);
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
  }

  if (count > 0) {
    console.log(`Writing final batch of ${count} updates...`);
    await batch.commit();
  }

  console.log(`Migration finished. Successfully updated ${totalMigrated} documents.`);
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
