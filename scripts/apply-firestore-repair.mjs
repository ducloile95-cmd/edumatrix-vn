import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { decodeFirestoreFields, parseFlag } from "./firestore-export-data.mjs";

const API = "https://firestore.googleapis.com/v1";
const PROJECT_ID = "edumatrix-vn-576b1";

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)])) } };
  }
  throw new Error(`Cannot encode value: ${String(value)}`);
}

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  const argv = process.argv.slice(2);
  const keyFile = path.resolve(parseFlag(argv, "--key") ?? "");
  const planFile = path.resolve(parseFlag(argv, "--plan") ?? "");
  const journalFile = path.resolve(parseFlag(argv, "--journal") ?? "");
  const apply = argv.includes("--apply");
  if (!fs.existsSync(keyFile) || !fs.existsSync(planFile) || !journalFile) {
    throw new Error("Required: --key <service-account.json> --plan <repair-plan.json> --journal <new-journal.json> [--apply]");
  }
  if (fs.existsSync(journalFile)) throw new Error(`Journal already exists: ${journalFile}`);
  const key = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  if (key.project_id !== PROJECT_ID) throw new Error(`Wrong project: ${key.project_id}`);
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  if (plan.mode !== "DRY_RUN_ONLY" || !Array.isArray(plan.operations)) throw new Error("Invalid repair plan.");
  if (plan.operations.length > 500) throw new Error("Repair plan exceeds Firestore's 500-write atomic limit.");
  for (const operation of plan.operations) {
    const action = operation?.action ?? "update";
    if (!operation || typeof operation.collection !== "string" || !/^[a-z][a-z0-9_]*$/.test(operation.collection) ||
        typeof operation.id !== "string" || !operation.id || typeof operation.before !== "object" || operation.before === null ||
        !["update", "delete"].includes(action) ||
        (operation.beforeKeys !== undefined && (!Array.isArray(operation.beforeKeys) || operation.beforeKeys.some((field) => typeof field !== "string"))) ||
        (action === "update" && (typeof operation.after !== "object" || operation.after === null || Object.keys(operation.after).length === 0))) {
      throw new Error("Repair plan contains an invalid operation.");
    }
  }

  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({ keyFile, scopes: ["https://www.googleapis.com/auth/datastore"] });
  const client = await auth.getClient();
  const base = `${API}/projects/${PROJECT_ID}/databases/(default)/documents`;
  const documentUrl = (collection, id) => `${base}/${collection}/${encodeURIComponent(id)}`;

  async function getDocument(collection, id, required = true) {
    try {
      const response = await client.request({ url: documentUrl(collection, id) });
      return response.data;
    } catch (error) {
      if (!required && error?.response?.status === 404) return null;
      throw error;
    }
  }

  const now = new Date().toISOString();
  const writes = [];
  const before = [];

  for (const operation of plan.operations) {
    const current = await getDocument(operation.collection, operation.id);
    const decoded = decodeFirestoreFields(current.fields ?? {});
    if (operation.beforeKeys && !equal(Object.keys(decoded).sort(), [...operation.beforeKeys].sort())) {
      throw new Error(`Concurrent schema change detected: ${operation.collection}/${operation.id}`);
    }
    for (const [field, expected] of Object.entries(operation.before)) {
      if (!equal(decoded[field] ?? null, expected)) {
        throw new Error(`Concurrent change detected: ${operation.collection}/${operation.id}.${field}`);
      }
    }
    before.push(current);
    if ((operation.action ?? "update") === "delete") {
      writes.push({ delete: current.name, currentDocument: { updateTime: current.updateTime } });
    } else {
      const after = Object.fromEntries(Object.entries(operation.after).map(([field, value]) => [
        field,
        value === "SERVER_TIMESTAMP" ? now : value,
      ]));
      writes.push({
        update: {
          name: current.name,
          fields: Object.fromEntries(Object.entries(after).map(([field, value]) => [field, encodeValue(value)])),
        },
        updateMask: { fieldPaths: Object.keys(after) },
        currentDocument: { updateTime: current.updateTime },
      });
    }
  }

  const journal = {
    projectId: PROJECT_ID,
    createdAt: now,
    applied: apply,
    writeCount: writes.length,
    before,
  };
  fs.mkdirSync(path.dirname(journalFile), { recursive: true });
  fs.writeFileSync(journalFile, `${JSON.stringify(journal, null, 2)}\n`, { flag: "wx" });
  console.log(`Journal: ${journalFile}`);
  console.log(`Writes prepared: ${writes.length}`);
  if (!apply) return console.log("Dry run only. Add --apply to commit atomically.");
  await client.request({ url: `${base}:commit`, method: "POST", data: { writes } });
  console.log("Firestore repair committed atomically.");
}

main().catch((error) => {
  console.error(error?.response?.data ?? error?.message ?? error);
  process.exit(1);
});
