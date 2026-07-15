import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve("wrangler.jsonc");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const origin = config.env?.production?.vars?.ALLOWED_ORIGIN;

if (typeof origin !== "string" || !origin.startsWith("https://")) {
  throw new Error("env.production.vars.ALLOWED_ORIGIN must be an https origin.");
}

if (/localhost|127\.0\.0\.1|REPLACE_WITH_HOSTING_DOMAIN/i.test(origin)) {
  throw new Error("env.production.vars.ALLOWED_ORIGIN must not be localhost or a placeholder.");
}

console.log(`Production ALLOWED_ORIGIN: ${origin}`);
