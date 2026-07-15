import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_FIRESTORE_PORT = 8090;
const FIREBASE_CONFIG = path.join(ROOT, "firebase.json");

function readFirebaseConfig() {
  return JSON.parse(fs.readFileSync(FIREBASE_CONFIG, "utf8"));
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findOpenPort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error(`No open Firestore emulator port found from ${startPort} to ${startPort + 49}.`);
}

const baseConfig = readFirebaseConfig();
const requestedPort = Number(process.env.FIRESTORE_EMULATOR_PORT || baseConfig.emulators?.firestore?.port || DEFAULT_FIRESTORE_PORT);
const firestorePort = await findOpenPort(Number.isFinite(requestedPort) ? requestedPort : DEFAULT_FIRESTORE_PORT);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "edumatrix-rules-"));
const tempConfigPath = path.join(tempDir, "firebase.json");

const tempConfig = {
  firestore: {
    ...baseConfig.firestore,
    rules: path.resolve(ROOT, baseConfig.firestore.rules),
    indexes: path.resolve(ROOT, baseConfig.firestore.indexes),
  },
  emulators: {
    firestore: {
      ...(baseConfig.emulators?.firestore ?? {}),
      host: "127.0.0.1",
      port: firestorePort,
    },
  },
};

fs.writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));

console.log(`Running Firestore rules tests on emulator port ${firestorePort}`);

const firebaseCli = path.join(ROOT, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");

const result = spawnSync(
  process.execPath,
  [firebaseCli, "emulators:exec", "--only", "firestore", "--config", tempConfigPath, "vitest run firebase/tests --maxWorkers=1"],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      FIRESTORE_EMULATOR_PORT: String(firestorePort),
    },
    stdio: "inherit",
  },
);

fs.rmSync(tempDir, { force: true, recursive: true });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
