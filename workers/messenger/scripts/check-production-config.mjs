import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve("wrangler.jsonc");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const origin = config.env?.production?.vars?.ALLOWED_ORIGIN;
const graphVersion = config.env?.production?.vars?.META_GRAPH_VERSION;
const pageId = config.env?.production?.vars?.META_PAGE_ID;

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

console.log(`Production config: origin=${origin}, graph=${graphVersion}, page=${pageId}`);
