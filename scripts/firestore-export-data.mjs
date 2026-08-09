import fs from "node:fs";
import path from "node:path";

export function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields ?? {});
  return value;
}

export function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

export function loadExportCollection(inputDir, collectionName) {
  const filePath = path.join(inputDir, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${filePath} khong phai mang document Firestore.`);
  return raw.map((document) => ({
    id: document.id,
    ...decodeFirestoreFields(document.fields ?? {}),
  }));
}

export function parseFlag(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? null : null;
}

