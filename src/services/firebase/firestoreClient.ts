import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";
import { firebaseApp } from "@/services/firebase/app";

// Bat offline persistence 1 tab - giup giam read khi mo lai app (A14/A21.8).
export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({}),
  }),
});

// Test local: bat VITE_USE_EMULATORS=true de tro Firestore(8090) sang Firebase Emulator.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "127.0.0.1", 8090);
}
