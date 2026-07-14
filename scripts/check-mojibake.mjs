import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const roots = ["src", "docs", "scripts", "firebase", "README.md", "package.json", "vite.config.ts"];
const textExtensions = new Set([".css", ".html", ".json", ".md", ".mjs", ".rules", ".ts", ".tsx"]);
const suspicious = [
  /Ã[\u00A0-\u00BF]/,
  /Â[\u00A0\u0080-\u009F]/,
  /Ä[\u0080-\u00BF]/,
  /Æ[\u0080-\u00BF]/,
  /áº[\u0080-\u00BF]/,
  /á»[\u0080-\u00BF]/,
  /â€./,
];

function* walk(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    yield target;
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    yield* walk(path.join(target, entry.name));
  }
}

const findings = [];

for (const root of roots) {
  for (const file of walk(root)) {
    if (path.normalize(file) === path.normalize("scripts/check-mojibake.mjs")) continue;
    if (!textExtensions.has(path.extname(file))) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (suspicious.some((pattern) => pattern.test(line))) {
        findings.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

if (findings.length > 0) {
  console.error("Found possible mojibake:");
  console.error(findings.join("\n"));
  process.exitCode = 1;
}
