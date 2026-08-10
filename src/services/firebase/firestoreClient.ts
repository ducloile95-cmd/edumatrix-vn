import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from "firebase/firestore";
import { firebaseApp } from "@/services/firebase/app";

// Dung cache bo nho de tab thu hai va lease IndexedDB cu khong chan Firestore.
// React Query van giu cache trong phien de giam refetch tren Spark.
export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: memoryLocalCache(),
});

// Test local: bat VITE_USE_EMULATORS=true de tro Firestore(8091) sang Firebase Emulator.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "127.0.0.1", 8091);
}
