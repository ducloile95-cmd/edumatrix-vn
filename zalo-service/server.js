import { timingSafeEqual } from "node:crypto";
import express from "express";
import fs from "node:fs";
import { Zalo, ThreadType } from "zca-js";

const PORT = Number(process.env.PORT || 3000);
const API_TOKEN = process.env.API_TOKEN?.trim() || "";
const CREDENTIALS_FILE = "./zalo-credentials.json";
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const IDEMPOTENCY_TTL_MS = 10 * 60_000;

function normalizePhone(value) {
  let phone = typeof value === "string" ? value.trim().replace(/[\s.-]/g, "") : "";
  if (phone.startsWith("+84")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("84")) phone = `0${phone.slice(2)}`;
  return /^0\d{9}$/.test(phone) ? phone : null;
}

if (API_TOKEN.length < 32) {
  throw new Error("API_TOKEN must be configured with at least 32 characters");
}

const allowedPhones = new Set(
  (process.env.ALLOWED_PHONE_NUMBERS || "")
    .split(",")
    .map(normalizePhone)
    .filter(Boolean),
);
if (allowedPhones.size === 0) {
  throw new Error("ALLOWED_PHONE_NUMBERS must contain at least one valid Vietnamese phone number");
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));

const zalo = new Zalo({ selfListen: false, checkUpdate: true });
const rateBuckets = new Map();
const idempotencyCache = new Map();
let zaloApi = null;

function setupListener() {
  if (!zaloApi?.listener) return;
  zaloApi.listener.start();
  zaloApi.listener.on("error", () => console.error("[Zalo Service] Listener error"));
}

async function initZalo() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));
      zaloApi = await zalo.login(credentials);
    } else {
      zaloApi = await zalo.loginQR({}, (qrPath) => {
        console.log(`[Zalo Service] Scan the QR code at: ${qrPath}`);
      });
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(zaloApi.getCredentials()), { mode: 0o600 });
    }
    setupListener();
    console.log("[Zalo Service] Connected");
  } catch {
    zaloApi = null;
    console.error("[Zalo Service] Connection failed; credentials were left intact for manual recovery");
  }
}

function authenticate(req, res, next) {
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  const expectedBuffer = Buffer.from(API_TOKEN);
  const suppliedBuffer = Buffer.from(supplied);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, startedAt: now });
    return next();
  }
  if (bucket.count >= RATE_LIMIT) return res.status(429).json({ error: "Too many requests" });
  bucket.count += 1;
  next();
}

app.get("/api/status", authenticate, (_req, res) => {
  res.json({ status: zaloApi ? "connected" : "disconnected" });
});

app.post("/api/send-message", authenticate, rateLimit, async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];
  const phone = normalizePhone(req.body?.phoneNumber);
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    return res.status(400).json({ error: "A valid Idempotency-Key is required" });
  }
  if (!phone || !allowedPhones.has(phone) || message.length === 0 || message.length > 2000) {
    return res.status(400).json({ error: "Invalid recipient or message" });
  }
  if (!zaloApi) return res.status(503).json({ error: "Service unavailable" });

  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt <= now) idempotencyCache.delete(key);
  }
  let entry = idempotencyCache.get(idempotencyKey);
  if (!entry) {
    const operation = (async () => {
      const user = await zaloApi.findUser(phone);
      if (!user?.uid) return { status: 404, body: { error: "Recipient not found" } };
      await zaloApi.sendMessage({ msg: message }, user.uid, ThreadType.User);
      return { status: 200, body: { success: true } };
    })();
    entry = { expiresAt: now + IDEMPOTENCY_TTL_MS, operation };
    idempotencyCache.set(idempotencyKey, entry);
  }

  try {
    const result = await entry.operation;
    return res.status(result.status).json(result.body);
  } catch {
    idempotencyCache.delete(idempotencyKey);
    console.error("[Zalo Service] Message delivery failed");
    return res.status(502).json({ error: "Message delivery failed" });
  }
});

app.listen(PORT, async () => {
  console.log(`[Zalo Service] Listening on port ${PORT}`);
  await initZalo();
});
