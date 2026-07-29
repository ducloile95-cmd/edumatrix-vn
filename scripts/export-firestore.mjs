// Xuat toan bo Firestore production ra JSON de sao luu (P4-002).
//
// Vi sao script nay ton tai: Spark plan khong co scheduled export (do la tinh nang
// Blaze + GCS bucket), va Firebase Console khong co nut xuat collection. Truoc doi
// nay quy trinh backup duy nhat la thu cong va khong ai lam duoc dung.
//
// Dinh dang xuat = "document wire format" cua Firestore REST API, giu nguyen kieu
// du lieu (timestampValue, referenceValue, mapValue...). Khong tu chuyen doi sang
// kieu JS - do la cho de mat kieu du lieu khi khoi phuc.
//
// Dung:
//   node scripts/export-firestore.mjs                      # xuat tat ca collection
//   node scripts/export-firestore.mjs --only users,students
//   node scripts/export-firestore.mjs --out D:\backup\edumatrix
//   node scripts/export-firestore.mjs --key <duong-dan-service-account.json>
//   node scripts/export-firestore.mjs --self-check         # tu kiem tra, khong can mang
//
// Moi document doc ra ton 1 read trong han muc Spark (50.000/ngay).
// Script in tong so read da dung o cuoi.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const FIRESTORE_API = "https://firestore.googleapis.com/v1";
const PAGE_SIZE = 300;
const SPARK_DAILY_READ_LIMIT = 50_000;

// ---------- Phan thuan tuy, duoc --self-check kiem tra ----------

/** "projects/p/databases/(default)/documents/users/abc" -> "abc" */
export function documentIdFromName(name) {
  return String(name).split("/").pop() ?? "";
}

export function parseArgs(argv) {
  const options = { only: null, out: null, key: null, selfCheck: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--self-check") options.selfCheck = true;
    if (flag === "--only") options.only = (argv[index + 1] ?? "").split(",").map((v) => v.trim()).filter(Boolean);
    if (flag === "--out") options.out = argv[index + 1] ?? null;
    if (flag === "--key") options.key = argv[index + 1] ?? null;
  }
  return options;
}

/** Loc theo --only va bao loi neu go sai ten collection (tranh backup rong ma tuong thanh cong). */
export function pickCollections(available, only) {
  if (!only) return [...available].sort();
  const unknown = only.filter((name) => !available.includes(name));
  if (unknown.length) {
    throw new Error(`Khong co collection: ${unknown.join(", ")}. Hien co: ${[...available].sort().join(", ")}`);
  }
  return [...only].sort();
}

/** Ten thu muc backup theo thoi diem, an toan tren Windows (khong dau hai cham). */
export function backupDirName(date) {
  return `firestore-${date.toISOString().slice(0, 19).replaceAll(":", "-")}Z`;
}

function selfCheck() {
  const assert = (condition, label) => {
    if (!condition) throw new Error(`SELF-CHECK FAIL: ${label}`);
  };

  assert(documentIdFromName("projects/p/databases/(default)/documents/users/abc") === "abc", "documentIdFromName lay doan cuoi");
  assert(documentIdFromName("projects/p/databases/(default)/documents/attendance/s1_st1") === "s1_st1", "documentIdFromName giu dau gach duoi");

  const parsed = parseArgs(["--only", "users, students ", "--out", "D:\\bk"]);
  assert(JSON.stringify(parsed.only) === '["users","students"]', "parseArgs cat khoang trang trong --only");
  assert(parsed.out === "D:\\bk", "parseArgs doc --out");
  assert(parseArgs([]).only === null, "khong co --only thi xuat tat ca");

  assert(JSON.stringify(pickCollections(["b", "a"], null)) === '["a","b"]', "pickCollections sap xep");
  assert(JSON.stringify(pickCollections(["users", "students"], ["students"])) === '["students"]', "pickCollections loc dung");
  let threw = false;
  try { pickCollections(["users"], ["user"]); } catch { threw = true; }
  assert(threw, "pickCollections nem loi khi go sai ten");

  assert(!backupDirName(new Date("2026-07-29T06:10:52.691Z")).includes(":"), "ten thu muc khong co dau hai cham");

  console.log("Self-check OK.");
}

// ---------- Phan goi mang ----------

function resolveKeyFile(explicit) {
  if (explicit) return path.resolve(explicit);
  const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const found = fs.readdirSync(rootDir).find((name) => /firebase-adminsdk.*\.json$/.test(name));
  if (!found) {
    throw new Error("Khong tim thay file service account (*firebase-adminsdk*.json) o thu muc goc. Dung --key de chi ro.");
  }
  return path.join(rootDir, found);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfCheck) return selfCheck();

  const keyFile = resolveKeyFile(options.key);
  const projectId = JSON.parse(fs.readFileSync(keyFile, "utf8")).project_id;
  if (!projectId) throw new Error(`File key ${keyFile} khong co project_id.`);

  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({ keyFile, scopes: ["https://www.googleapis.com/auth/datastore"] });
  const client = await auth.getClient();
  const base = `${FIRESTORE_API}/projects/${projectId}/databases/(default)/documents`;

  const listed = await client.request({ url: `${base}:listCollectionIds`, method: "POST", data: { pageSize: 300 } });
  const available = listed.data.collectionIds ?? [];
  const collections = pickCollections(available, options.only);

  const startedAt = new Date();
  const outDir = path.resolve(options.out ?? path.join("backups", backupDirName(startedAt)));
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Project ${projectId} -> ${outDir}`);
  const counts = {};

  for (const collection of collections) {
    const documents = [];
    let pageToken = "";
    do {
      const url = `${base}/${collection}?pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
      const page = await client.request({ url });
      for (const document of page.data.documents ?? []) {
        documents.push({ id: documentIdFromName(document.name), fields: document.fields ?? {}, createTime: document.createTime, updateTime: document.updateTime });
      }
      pageToken = page.data.nextPageToken ?? "";
    } while (pageToken);

    fs.writeFileSync(path.join(outDir, `${collection}.json`), `${JSON.stringify(documents, null, 2)}\n`, "utf8");
    counts[collection] = documents.length;
    console.log(`  ${collection.padEnd(28)} ${documents.length}`);
  }

  const totalDocuments = Object.values(counts).reduce((sum, value) => sum + value, 0);
  fs.writeFileSync(path.join(outDir, "_manifest.json"), `${JSON.stringify({
    projectId,
    exportedAt: startedAt.toISOString(),
    exportedBy: process.env.USERNAME ?? process.env.USER ?? "unknown",
    collections: counts,
    totalDocuments,
    format: "firestore-rest-v1-documents",
  }, null, 2)}\n`, "utf8");

  console.log(`\nTong ${totalDocuments} document (= ${totalDocuments} read trong han muc ${SPARK_DAILY_READ_LIMIT.toLocaleString("en-US")}/ngay).`);
  if (totalDocuments > SPARK_DAILY_READ_LIMIT * 0.4) {
    console.warn("CANH BAO: lan xuat nay an tren 40% han muc read mot ngay. Can nhac --only cho cac lan sau.");
  }
  console.log("Ban xuat chua du lieu ca nhan cua tre em - luu noi co phan quyen, khong dua vao repository.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
