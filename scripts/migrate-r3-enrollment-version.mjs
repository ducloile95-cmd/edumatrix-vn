import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { GoogleAuth } from "google-auth-library";

const projectId = process.env.FIREBASE_PROJECT_ID;
// Khong mac dinh project production: phai chi ro project dich moi chay.
if (!projectId) {
  console.error("Set FIREBASE_PROJECT_ID explicitly (no default to production).");
  process.exit(1);
}
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const apply = process.argv.includes("--apply");
const rollbackIndex = process.argv.indexOf("--rollback");
const keyIndex = process.argv.indexOf("--key");
const explicitKey = keyIndex >= 0 ? process.argv[keyIndex + 1] : null;
const autoKey = fs.readdirSync(path.resolve(".")).find((name) => /firebase-adminsdk.*\.json$/.test(name));
const keyFile = explicitKey ? path.resolve(explicitKey) : autoKey ? path.resolve(autoKey) : undefined;
let authorizationHeaders;
try {
  const client = await new GoogleAuth({ keyFile, scopes: ["https://www.googleapis.com/auth/datastore"] }).getClient();
  authorizationHeaders = (url) => client.getRequestHeaders(url);
} catch {
  const require = createRequire(import.meta.url);
  const firebaseAuth = require("firebase-tools/lib/auth");
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("No ADC or Firebase CLI refresh token.");
  authorizationHeaders = async () => {
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

async function listEnrollments() {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${base}/enrollments`);
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await request(url);
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return documents;
}

async function commit(writes, onBatchCommitted) {
  for (let offset = 0; offset < writes.length; offset += 500) {
    const result = await request(`${base}:commit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ writes: writes.slice(offset, offset + 500) }),
    });
    if (onBatchCommitted) onBatchCommitted(offset, result.writeResults ?? []);
  }
}

if (rollbackIndex >= 0) {
  const backupPath = process.argv[rollbackIndex + 1];
  if (!backupPath) throw new Error("Usage: --rollback <backup.json>");
  const backup = JSON.parse(fs.readFileSync(path.resolve(backupPath), "utf8"));
  const writes = backup.documents.map((entry) => {
    if (!entry.postMigrationUpdateTime) throw new Error("Backup is incomplete; refusing rollback without a post-migration precondition.");
    const document = entry.document;
    return {
      update: {
        name: document.name,
        fields: {
          ...(document.fields.version ? { version: document.fields.version } : {}),
          ...(document.fields.updatedAt ? { updatedAt: document.fields.updatedAt } : {}),
        },
      },
      updateMask: { fieldPaths: ["version", "updatedAt"] },
      currentDocument: { updateTime: entry.postMigrationUpdateTime },
    };
  });
  await commit(writes);
  console.log(JSON.stringify({ mode: "rollback", restored: writes.length, backup: path.resolve(backupPath) }, null, 2));
} else {
  const documents = await listEnrollments();
  const affected = documents.filter((document) => !document.fields?.version || !document.fields?.updatedAt);
  const summary = { mode: apply ? "apply" : "dry-run", projectId, enrollments: documents.length, affected: affected.length };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    console.log("No writes performed. Re-run with --apply after reviewing the count.");
  } else {
    const backupDir = path.resolve("backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `r3-enrollments-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    const backup = {
      createdAt: new Date().toISOString(),
      projectId,
      documents: affected.map((document) => ({ document, postMigrationUpdateTime: null })),
    };
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    const writes = affected.map((document) => ({
      update: {
        name: document.name,
        fields: {
          version: document.fields?.version ?? { integerValue: "1" },
          updatedAt: document.fields?.updatedAt ?? { timestampValue: document.updateTime },
        },
      },
      updateMask: { fieldPaths: ["version", "updatedAt"] },
      currentDocument: { updateTime: document.updateTime },
    }));
    await commit(writes, (offset, writeResults) => {
      writeResults.forEach((result, index) => {
        backup.documents[offset + index].postMigrationUpdateTime = result.updateTime;
      });
      // Persist each committed batch so rollback never guesses which documents changed.
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    });
    console.log(JSON.stringify({ ...summary, updated: writes.length, backup: backupPath }, null, 2));
  }
}
