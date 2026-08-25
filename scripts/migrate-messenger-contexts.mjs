import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { GoogleAuth } from "google-auth-library";

const projectId = process.env.FIREBASE_PROJECT_ID || "edumatrix-vn-576b1";
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const apply = process.argv.includes("--apply");
const rollbackIndex = process.argv.indexOf("--rollback");
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/datastore"] });
let authorizationHeaders;
try {
  const client = await auth.getClient();
  authorizationHeaders = (url) => client.getRequestHeaders(url);
} catch {
  const require = createRequire(import.meta.url);
  const firebaseAuth = require("firebase-tools/lib/auth");
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("No ADC or Firebase CLI refresh token. Run firebase login or set GOOGLE_APPLICATION_CREDENTIALS.");
  authorizationHeaders = async () => {
    if (account.tokens.access_token && Number(account.tokens.expires_at ?? 0) > Date.now() + 60_000) {
      return { authorization: `Bearer ${account.tokens.access_token}` };
    }
    const token = await firebaseAuth.getAccessToken(account.tokens.refresh_token, ["https://www.googleapis.com/auth/datastore"]);
    return { authorization: `Bearer ${token.access_token}` };
  };
}

async function request(url, init = {}) {
  const headers = await authorizationHeaders(url);
  const response = await fetch(url, { ...init, headers: { ...headers, ...init.headers } });
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.status === 204 ? null : response.json();
}

async function list(collectionId) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${base}/${collectionId}`);
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await request(url);
    documents.push(...(data.documents ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return documents;
}

async function commit(writes) {
  for (let offset = 0; offset < writes.length; offset += 500) {
    await request(`${base}:commit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ writes: writes.slice(offset, offset + 500) }),
    });
  }
}

if (rollbackIndex >= 0) {
  const backupPath = process.argv[rollbackIndex + 1];
  if (!backupPath) throw new Error("Usage: npm run migrate:messenger-contexts -- --rollback <backup.json>");
  const backup = JSON.parse(fs.readFileSync(path.resolve(backupPath), "utf8"));
  const writes = [...backup.connections, ...backup.psidLinks].map((document) => ({ update: { name: document.name, fields: document.fields } }));
  await commit(writes);
  console.log(JSON.stringify({ mode: "rollback", restored: writes.length, backup: path.resolve(backupPath) }, null, 2));
} else {
  const [connections, psidLinks] = await Promise.all([list("messenger_connections"), list("messenger_psid_links")]);
  const affectedConnections = connections.filter((document) => document.fields?.status?.stringValue !== "needs_context");
  const affectedPsidLinks = psidLinks.filter((document) => document.fields?.status?.stringValue !== "needs_context");
  const summary = {
    mode: apply ? "apply" : "dry-run",
    projectId,
    connections: connections.length,
    psidLinks: psidLinks.length,
    affectedConnections: affectedConnections.length,
    affectedPsidLinks: affectedPsidLinks.length,
  };

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    console.log("No writes performed. Re-run with --apply after reviewing these counts.");
  } else {
    const backupDir = path.resolve("backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `messenger-contexts-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), projectId, connections, psidLinks }, null, 2));
    const now = new Date().toISOString();
    const writes = [...affectedConnections, ...affectedPsidLinks].map((document) => ({
      update: {
        name: document.name,
        fields: {
          status: { stringValue: "needs_context" },
          activeStudentId: { nullValue: null },
          contextResetAt: { timestampValue: now },
        },
      },
      updateMask: { fieldPaths: ["status", "activeStudentId", "contextResetAt"] },
      currentDocument: { updateTime: document.updateTime },
    }));
    await commit(writes);
    console.log(JSON.stringify({ ...summary, backup: backupPath, updated: writes.length }, null, 2));
  }
}
