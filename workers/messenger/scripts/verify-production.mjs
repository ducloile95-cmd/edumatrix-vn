import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const repositoryRoot = path.resolve("../..");
  const frontendEnv = fs.readFileSync(path.join(repositoryRoot, ".env.real"), "utf8");
  const workerUrl = frontendEnv.match(/^VITE_MESSENGER_WORKER_URL=(\S+)$/m)?.[1];
  if (!workerUrl) throw new Error("VITE_MESSENGER_WORKER_URL is missing from .env.real.");

  const releaseSha = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  const allowedOrigin = "https://edumatrix.id.vn";

  const healthResponse = await fetch(`${workerUrl}/health.release`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || health?.ok !== true) throw new Error(`Worker health failed with ${healthResponse.status}.`);
  if (health.release !== releaseSha) throw new Error(`Worker release mismatch: live=${health.release ?? "missing"}, expected=${releaseSha}.`);
  if (health.utilityMessagingEnabled !== false || health.utilityAutomationEnabled !== false) throw new Error("R1 requires Utility Messaging and automation to remain disabled.");

  const authResponse = await fetch(`${workerUrl}/api/meta/connect/start`, {
    method: "POST",
    headers: { origin: allowedOrigin },
  });
  if (authResponse.status !== 401) throw new Error(`Meta connect auth check returned ${authResponse.status}, expected 401.`);

  const validCors = await fetch(`${workerUrl}/api/messenger/send`, {
    method: "OPTIONS",
    headers: { origin: allowedOrigin },
  });
  if (validCors.headers.get("access-control-allow-origin") !== allowedOrigin) {
    throw new Error("Worker did not allow the production origin.");
  }

  const invalidCors = await fetch(`${workerUrl}/api/messenger/send`, {
    method: "OPTIONS",
    headers: { origin: "https://invalid.example" },
  });
  if (invalidCors.headers.has("access-control-allow-origin")) {
    throw new Error("Worker emitted an allow-origin header for an untrusted origin.");
  }

  console.log(`Production Worker verified: ${workerUrl}, release=${releaseSha}, utility=false`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
