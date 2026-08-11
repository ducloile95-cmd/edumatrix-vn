import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve("wrangler.jsonc");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const origin = config.env?.production?.vars?.ALLOWED_ORIGIN;
const graphVersion = config.env?.production?.vars?.META_GRAPH_VERSION;
const pageId = config.env?.production?.vars?.META_PAGE_ID;
const workerUtility = config.env?.production?.vars?.UTILITY_MESSAGING_ENABLED;
const frontendEnv = fs.readFileSync(path.resolve("../..", ".env.real"), "utf8");
const frontendUtility = frontendEnv.match(/^VITE_UTILITY_MESSAGING_ENABLED=(true|false)$/m)?.[1];
const workerUrl = frontendEnv.match(/^VITE_MESSENGER_WORKER_URL=(\S+)$/m)?.[1];
const canonicalWorkerUrl = "https://edumatrix-messenger-production.ducloile99.workers.dev";

if (typeof origin !== "string" || !origin.startsWith("https://")) {
  throw new Error("env.production.vars.ALLOWED_ORIGIN must be an https origin.");
}

if (/localhost|127\.0\.0\.1|REPLACE_WITH_HOSTING_DOMAIN/i.test(origin)) {
  throw new Error("env.production.vars.ALLOWED_ORIGIN must not be localhost or a placeholder.");
}

if (graphVersion !== "v25.0") {
  throw new Error("env.production.vars.META_GRAPH_VERSION must be v25.0.");
}

if (typeof pageId !== "string" || !/^\d+$/.test(pageId)) {
  throw new Error("env.production.vars.META_PAGE_ID must be a numeric Facebook Page ID.");
}

if (!frontendUtility || !["true", "false"].includes(workerUtility)) {
  throw new Error("Utility Messaging flags must be true or false in .env.real and Worker production.");
}

if (frontendUtility !== workerUtility) {
  throw new Error(`Utility Messaging mismatch: frontend=${frontendUtility}, worker=${workerUtility}.`);
}

if (workerUrl !== canonicalWorkerUrl) {
  throw new Error(`VITE_MESSENGER_WORKER_URL must be ${canonicalWorkerUrl}.`);
}

console.log(`Production config: worker=${workerUrl}, origin=${origin}, graph=${graphVersion}, page=${pageId}, utility=${workerUtility}`);
