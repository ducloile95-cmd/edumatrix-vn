import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const repositoryRoot = path.resolve("../..");
const releaseSha = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();
const dryRun = process.argv.includes("--dry-run");
const workingTree = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
if (!dryRun && workingTree) throw new Error("Production deploy requires a clean tracked working tree. Commit the release first.");

if (!/^[0-9a-f]{12}$/.test(releaseSha)) {
  throw new Error("Unable to resolve a 12-character Git release SHA.");
}

const wranglerPath = path.resolve("node_modules/wrangler/bin/wrangler.js");
const args = [wranglerPath, "deploy", "--env", "production", "--var", `RELEASE_SHA:${releaseSha}`];
if (dryRun) args.push("--dry-run");

const result = spawnSync(process.execPath, args, { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
