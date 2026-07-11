import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";

/**
 * Firebase Web Config duoc phep xuat hien o client (A10), nhung day KHONG
 * phai la lop bao mat - Firestore Security Rules moi la lop bao mat chinh (A16).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

// App Check debug token cho local dev (A17) - khong bao gio dung trong production.
if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
  (globalThis as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
}

export const appCheck: AppCheck | undefined = import.meta.env
  .VITE_APPCHECK_SITE_KEY
  ? initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_APPCHECK_SITE_KEY,
      ),
      isTokenAutoRefreshEnabled: true,
    })
  : undefined;

export const auth: Auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Bat offline persistence 1 tab - giup giam read khi mo lai app (A14/A21.8).
export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({}),
  }),
});
