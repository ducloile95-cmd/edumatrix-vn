import fs from "node:fs";
import path from "node:path";

const baseline = JSON.parse(fs.readFileSync(path.resolve("docs/quality-baseline.json"), "utf8"));
const assetsDir = path.resolve("dist/assets");
const files = fs.readdirSync(assetsDir).filter((name) => name.endsWith(".js"));
const sizes = files.map((name) => ({ name, bytes: fs.statSync(path.join(assetsDir, name)).size }));
const totalBytes = sizes.reduce((sum, item) => sum + item.bytes, 0);
const largest = sizes.sort((left, right) => right.bytes - left.bytes)[0];
const budget = baseline.bundleBudgetBytes;
if (!Number.isInteger(budget) || budget <= 0) throw new Error("Missing bundleBudgetBytes in docs/quality-baseline.json");
console.log(JSON.stringify({ totalBytes, budgetBytes: budget, largest }, null, 2));
if (totalBytes > budget) throw new Error(`JavaScript bundle ${totalBytes} exceeds R1 budget ${budget}`);
