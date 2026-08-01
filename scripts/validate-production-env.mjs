import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.real");
const values = {};

for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) continue;
  values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
}

const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_APPCHECK_SITE_KEY",
];
const missingKeys = requiredKeys.filter((key) => !values[key]);

if (missingKeys.length > 0) {
  throw new Error(`Production environment is missing: ${missingKeys.join(", ")}`);
}

if (values.VITE_USE_EMULATORS !== "false") {
  throw new Error("Production environment must set VITE_USE_EMULATORS=false");
}

console.log("Production environment validation passed.");
