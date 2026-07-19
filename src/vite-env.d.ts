/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_APPCHECK_SITE_KEY: string;
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
  /** OAuth Web client ID; public identifier, never a client secret. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Browser API key restricted to authorized origins and Google Picker API. */
  readonly VITE_GOOGLE_PICKER_API_KEY?: string;
  /** Google Cloud project number used by Picker setAppId(). */
  readonly VITE_GOOGLE_PICKER_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
