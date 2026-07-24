import { decodeProtectedHeader, importPKCS8, importX509, jwtVerify, SignJWT } from "jose";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  META_PAGE_ACCESS_TOKEN: string;
  META_APP_SECRET: string;
  META_WEBHOOK_VERIFY_TOKEN: string;
  META_GRAPH_VERSION: string;
  ALLOWED_ORIGIN: string;
}

interface FirebaseClaims { sub: string; user_id?: string; email?: string }
interface StaffProfile { role: "admin" | "teacher" }
interface MessengerProfile { name: string | null; avatarUrl: string | null }
interface Recipient { psid: string; parentUid: string; threadId?: string }
interface ThreadContext {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  assignedTeacherIds: string[];
}
export interface SendBody { recipientPsid?: string; text: string; type?: string; studentId?: string; tag?: string }
export interface LinkConversationBody { psid?: string; studentId?: string }
export interface PostBody { message: string; link?: string; imageUrls?: string[] }
export interface InboundMessage { psid: string; pageId: string; text: string; messageId: string; timestamp: number }

function allowedOrigin(request: Request, env: Env): string {
  if (env.ALLOWED_ORIGIN.trim() === "*") return "*";
  const requestOrigin = request.headers.get("origin");
  const configuredOrigins = env.ALLOWED_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return requestOrigin && configuredOrigins.includes(requestOrigin)
    ? requestOrigin
    : configuredOrigins[0] ?? "";
}

export function corsHeaders(env: Env, request?: Request) {
  return {
    "access-control-allow-origin": request ? allowedOrigin(request, env) : env.ALLOWED_ORIGIN.trim() === "*" ? "*" : env.ALLOWED_ORIGIN.split(",")[0].trim(),
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "vary": "Origin",
    "content-type": "application/json",
  };
}

export function extractBearer(value: string | null): string | null {
  return value?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export function isMessengerTagShape(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z_]{3,64}$/.test(value.trim());
}

function normalizeSecret(value: string, key: string): string {
  let normalized = value.trim().replace(new RegExp(`^${key}\\s*=\\s*`), "").trim();
  if (normalized.startsWith("\"") && normalized.endsWith("\"")) {
    try { normalized = JSON.parse(normalized) as string; } catch { /* keep original */ }
  }
  return normalized.trim();
}

export function buildMessengerPayload(body: SendBody): Record<string, unknown> {
  const tag = body.tag?.trim();
  const payload: Record<string, unknown> = {
    recipient: { id: body.recipientPsid },
    messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
    message: { text: body.text },
  };
  if (tag) payload.tag = tag;
  return payload;
}

export async function verifyMetaSignature(raw: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = "sha256=" + [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) diff |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return diff === 0;
}

export function extractReferralLinks(payload: unknown): Array<{ nonce: string; psid: string; pageId: string }> {
  const result: Array<{ nonce: string; psid: string; pageId: string }> = [];
  if (!payload || typeof payload !== "object") return result;
  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    for (const event of (entry as { messaging?: unknown[] }).messaging ?? []) {
      if (!event || typeof event !== "object") continue;
      const value = event as { sender?: { id?: string }; recipient?: { id?: string }; referral?: { ref?: string }; postback?: { referral?: { ref?: string } } };
      const nonce = value.referral?.ref ?? value.postback?.referral?.ref;
      if (nonce && /^[A-Za-z0-9_-]{22,64}$/.test(nonce) && value.sender?.id && value.recipient?.id) result.push({ nonce, psid: value.sender.id, pageId: value.recipient.id });
    }
  }
  return result;
}

export function extractInboundMessages(payload: unknown): InboundMessage[] {
  const result: InboundMessage[] = [];
  if (!payload || typeof payload !== "object") return result;
  for (const entry of (payload as { entry?: unknown[] }).entry ?? []) {
    if (!entry || typeof entry !== "object") continue;
    for (const event of (entry as { messaging?: unknown[] }).messaging ?? []) {
      if (!event || typeof event !== "object") continue;
      const value = event as { sender?: { id?: string }; recipient?: { id?: string }; timestamp?: number; message?: { mid?: string; text?: string; is_echo?: boolean } };
      if (!value.message?.is_echo && value.sender?.id && value.recipient?.id && value.message?.mid && value.message.text?.trim()) {
        result.push({ psid: value.sender.id, pageId: value.recipient.id, text: value.message.text.trim().slice(0, 2000), messageId: value.message.mid, timestamp: value.timestamp ?? Date.now() });
      }
    }
  }
  return result;
}

async function verifyFirebaseToken(token: string, env: Env): Promise<FirebaseClaims> {
  const header = decodeProtectedHeader(token);
  if (header.alg !== "RS256" || !header.kid) throw new Error("invalid_token_header");
  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error("firebase_keys_unavailable");
  const certs = await response.json<Record<string, string>>();
  const cert = certs[header.kid];
  if (!cert) throw new Error("unknown_token_key");
  const key = await importX509(cert, "RS256");
  const { payload } = await jwtVerify(token, key, { audience: env.FIREBASE_PROJECT_ID, issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, algorithms: ["RS256"] });
  if (!payload.sub) throw new Error("missing_uid");
  return payload as unknown as FirebaseClaims;
}

function fieldString(document: unknown, name: string): string | undefined {
  return (document as { fields?: Record<string, { stringValue?: string }> })?.fields?.[name]?.stringValue;
}

function fieldStringArray(document: unknown, name: string): string[] {
  const values = (document as { fields?: Record<string, { arrayValue?: { values?: Array<{ stringValue?: string }> } }> })?.fields?.[name]?.arrayValue?.values ?? [];
  return values.map((value) => value.stringValue).filter((value): value is string => Boolean(value));
}

function fieldTimestamp(document: unknown, name: string): Date | null {
  const value = (document as { fields?: Record<string, { timestampValue?: string }> })?.fields?.[name]?.timestampValue;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function serviceAccessToken(env: Env): Promise<string> {
  let privateKey = env.FIREBASE_PRIVATE_KEY.trim();
  try {
    if (privateKey.startsWith("{")) {
      const parsed = JSON.parse(privateKey) as { private_key?: unknown };
      if (typeof parsed.private_key === "string") privateKey = parsed.private_key;
    } else if (privateKey.startsWith("\"private_key\"")) {
      const value = privateKey.replace(/^"private_key"\s*:\s*/, "").replace(/,\s*$/, "");
      privateKey = JSON.parse(value) as string;
    } else if (privateKey.startsWith("\"") && privateKey.endsWith("\"")) {
      privateKey = JSON.parse(privateKey) as string;
    }
  } catch {
    // Fall through to normalization and PKCS#8 validation below.
  }
  privateKey = privateKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----") || !privateKey.endsWith("-----END PRIVATE KEY-----")) {
    throw new Error("firebase_private_key_invalid_format");
  }
  const key = await importPKCS8(privateKey, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL).setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token").setIssuedAt().setExpirationTime("1h").sign(key);
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new Error("service_auth_failed");
  return String((await response.json<{ access_token: string }>()).access_token);
}

async function readDocument(collectionId: string, id: string, token: string, env: Env): Promise<unknown | null> {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${token}` } });
  return response.ok ? response.json() : null;
}

function firestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: JSON.stringify(value) };
}

function firestoreFields(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)]));
}

async function writeDocument(collectionPath: string, id: string, data: Record<string, unknown>, token: string, env: Env): Promise<void> {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionPath}/${encodeURIComponent(id)}`, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: firestoreFields(data) }) });
  if (!response.ok) throw new Error("firestore_write_failed");
}

async function updateDocumentFields(collectionPath: string, id: string, data: Record<string, unknown>, token: string, env: Env): Promise<void> {
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionPath}/${encodeURIComponent(id)}`);
  Object.keys(data).forEach((key) => url.searchParams.append("updateMask.fieldPaths", key));
  const response = await fetch(url, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: firestoreFields(data) }) });
  if (!response.ok) throw new Error("firestore_write_failed");
}

function documentUpdateTime(document: unknown): string | undefined {
  return (document as { updateTime?: string } | null)?.updateTime;
}

function documentName(collectionId: string, id: string, env: Env): string {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${id}`;
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function referralClaimUid(
  nonceDocument: unknown,
  existingConnection: unknown,
  existingPsidLink: unknown,
  psid: string,
  now = new Date(),
): string | null {
  const uid = fieldString(nonceDocument, "uid");
  const expiresAt = fieldTimestamp(nonceDocument, "expiresAt");
  if (!uid || fieldString(nonceDocument, "status") !== "active" || !expiresAt || expiresAt.getTime() <= now.getTime()) return null;
  if (fieldTimestamp(nonceDocument, "usedAt")) return null;
  const connectedPsid = fieldString(existingConnection, "facebookPsid");
  if (connectedPsid && connectedPsid !== psid) return null;
  const linkedUid = fieldString(existingPsidLink, "uid");
  if (linkedUid && linkedUid !== uid) return null;
  return uid;
}

async function claimReferralNonce(nonce: string, psid: string, pageId: string, token: string, env: Env): Promise<boolean> {
  const nonceDocument = await readDocument("messenger_link_nonces", nonce, token, env);
  if (!nonceDocument) return false;
  const targetUid = fieldString(nonceDocument, "uid");
  if (!targetUid) return false;
  const [existingConnection, existingPsidLink] = await Promise.all([
    readDocument("messenger_connections", targetUid, token, env),
    readDocument("messenger_psid_links", psid, token, env),
  ]);
  const uid = referralClaimUid(nonceDocument, existingConnection, existingPsidLink, psid);
  if (!uid) return false;
  const nonceUpdateTime = documentUpdateTime(nonceDocument);
  if (!nonceUpdateTime) return false;

  const connectionPrecondition = documentUpdateTime(existingConnection)
    ? { updateTime: documentUpdateTime(existingConnection) }
    : { exists: false };
  const psidPrecondition = documentUpdateTime(existingPsidLink)
    ? { updateTime: documentUpdateTime(existingPsidLink) }
    : { exists: false };
  const now = new Date();
  const writes = [
    {
      update: { name: documentName("messenger_link_nonces", nonce, env), fields: firestoreFields({ status: "used", usedAt: now, usedByPsid: psid, usedByPageId: pageId }) },
      updateMask: { fieldPaths: ["status", "usedAt", "usedByPsid", "usedByPageId"] },
      currentDocument: { updateTime: nonceUpdateTime },
    },
    {
      update: { name: documentName("messenger_connections", uid, env), fields: firestoreFields({ uid, facebookPsid: psid, pageId, status: "active", linkedAt: now }) },
      currentDocument: connectionPrecondition,
    },
    {
      update: { name: documentName("messenger_psid_links", psid, env), fields: firestoreFields({ uid, pageId, status: "active", updatedAt: now }) },
      currentDocument: psidPrecondition,
    },
  ];
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  return response.ok;
}

async function findConnectionByPsid(psid: string, token: string, env: Env): Promise<string | null> {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "messenger_connections" }],
        where: { fieldFilter: { field: { fieldPath: "facebookPsid" }, op: "EQUAL", value: { stringValue: psid } } },
        limit: 1,
      },
    }),
  });
  if (!response.ok) return null;
  const rows = await response.json<Array<{ document?: unknown }>>();
  const document = rows.find((row) => row.document)?.document;
  return fieldString(document, "uid") ?? null;
}

async function requireStaff(uid: string, idToken: string, env: Env): Promise<StaffProfile> {
  const profile = await readDocument("users", uid, idToken, env);
  const role = fieldString(profile, "role");
  if (fieldString(profile, "status") !== "active" || (role !== "admin" && role !== "teacher")) throw new Error("staff_required");
  return { role };
}

async function threadContext(studentId: string, serviceToken: string, env: Env): Promise<ThreadContext | null> {
  const student = await readDocument("students", studentId, serviceToken, env);
  if (!student) return null;
  const classId = fieldStringArray(student, "currentClassIds")[0] ?? "";
  const classDoc = classId ? await readDocument("classes", classId, serviceToken, env) : null;
  return {
    studentId,
    studentName: fieldString(student, "fullName") ?? studentId,
    classId,
    className: fieldString(classDoc, "name") ?? "Chưa xếp lớp",
    assignedTeacherIds: fieldStringArray(student, "teacherIds"),
  };
}

async function assertStudentScope(profile: StaffProfile, uid: string, context: ThreadContext | null): Promise<void> {
  if (!context) throw new Error("student_not_found");
  if (profile.role === "teacher" && !context.assignedTeacherIds.includes(uid)) throw new Error("student_scope_denied");
}

export function referralTargetAllowed(
  profile: StaffProfile,
  staffUid: string,
  parentStudentIds: string[],
  requestedStudentId: string,
  context: ThreadContext | null,
): boolean {
  if (!parentStudentIds.includes(requestedStudentId) || !context) return false;
  return profile.role === "admin" || context.assignedTeacherIds.includes(staffUid);
}

async function resolveRecipients(studentId: string, serviceToken: string, env: Env): Promise<Recipient[]> {
  const student = await readDocument("students", studentId, serviceToken, env);
  const recipients: Recipient[] = [];
  for (const parentUid of fieldStringArray(student, "parentUids")) {
    const connection = await readDocument("messenger_connections", parentUid, serviceToken, env);
    const psid = fieldString(connection, "facebookPsid");
    if (psid && fieldString(connection, "status") === "active") {
      const link = await readDocument("messenger_psid_links", psid, serviceToken, env);
      recipients.push({ psid, parentUid, threadId: fieldString(link, "threadId") });
    }
  }
  return recipients;
}

async function parentName(parentUid: string, serviceToken: string, env: Env): Promise<string> {
  return fieldString(await readDocument("users", parentUid, serviceToken, env), "displayName") ?? "Phụ huynh";
}

export function parseMessengerProfile(data: Record<string, unknown>): MessengerProfile {
  const firstName = typeof data.first_name === "string" ? data.first_name.trim() : "";
  const lastName = typeof data.last_name === "string" ? data.last_name.trim() : "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || null;
  const avatarUrl = typeof data.profile_pic === "string" && /^https:\/\//i.test(data.profile_pic)
    ? data.profile_pic
    : null;
  return { name, avatarUrl };
}

async function fetchMessengerProfile(psid: string, env: Env): Promise<MessengerProfile> {
  const pageAccessToken = normalizeSecret(env.META_PAGE_ACCESS_TOKEN, "META_PAGE_ACCESS_TOKEN");
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${encodeURIComponent(psid)}`);
  url.searchParams.set("fields", "first_name,last_name,profile_pic");
  const response = await fetch(url, { headers: { authorization: `Bearer ${pageAccessToken}` } });
  if (!response.ok) {
    console.warn("messenger_profile_unavailable", { psidSuffix: psid.slice(-4), status: response.status });
    return { name: null, avatarUrl: null };
  }
  return parseMessengerProfile(await response.json<Record<string, unknown>>());
}

function threadId(parentUid: string, studentId: string): string {
  return `messenger_${parentUid}_${studentId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

async function writeChatEvent(input: { context: ThreadContext; parentUid: string; direction: "inbound" | "outbound"; text: string; status: "received" | "sent" | "failed"; actorUid: string | null; metaMessageId: string | null; errorCode: string | null; occurredAt: Date; threadId?: string; messengerProfile?: MessengerProfile }, serviceToken: string, env: Env): Promise<void> {
  const id = input.threadId ?? threadId(input.parentUid, input.context.studentId);
  const parent = await parentName(input.parentUid, serviceToken, env);
  const existingThread = await readDocument("chat_threads", id, serviceToken, env);
  const responseWindowEndsAt = input.direction === "inbound"
    ? new Date(input.occurredAt.getTime() + 24 * 60 * 60 * 1000)
    : fieldTimestamp(existingThread, "responseWindowEndsAt");
  await writeDocument("chat_threads", id, {
    channel: "messenger", parentUid: input.parentUid, parentName: parent,
    studentId: input.context.studentId, studentName: input.context.studentName,
    classId: input.context.classId, className: input.context.className,
    assignedTeacherIds: input.context.assignedTeacherIds,
    lastMessagePreview: input.text.slice(0, 160), lastMessageDirection: input.direction,
    lastMessageAt: input.occurredAt,
    responseWindowEndsAt,
    unreadStaffCount: input.direction === "inbound" ? 1 : 0,
    status: "open", updatedAt: new Date(),
    linkStatus: "linked",
    facebookName: input.messengerProfile?.name ?? fieldString(existingThread, "facebookName"),
    facebookAvatarUrl: input.messengerProfile?.avatarUrl ?? fieldString(existingThread, "facebookAvatarUrl"),
  }, serviceToken, env);
  await writeDocument(`chat_threads/${id}/messages`, input.metaMessageId ?? crypto.randomUUID(), {
    direction: input.direction, text: input.text, actorUid: input.actorUid,
    status: input.status, metaMessageId: input.metaMessageId, errorCode: input.errorCode,
    createdAt: input.occurredAt, updatedAt: new Date(),
  }, serviceToken, env);
}

async function writeUnlinkedInbound(message: InboundMessage, profile: MessengerProfile, serviceToken: string, env: Env): Promise<void> {
  const id = `messenger_unlinked_${message.psid}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
  await writeDocument("chat_threads", id, {
    channel: "messenger", parentUid: "", parentName: profile.name ?? "Facebook chưa liên kết",
    studentId: "", studentName: "Chưa chọn học sinh", classId: "", className: "",
    assignedTeacherIds: [], messengerPsid: message.psid, pageId: message.pageId,
    lastMessagePreview: message.text.slice(0, 160), lastMessageDirection: "inbound",
    lastMessageAt: new Date(message.timestamp), responseWindowEndsAt: new Date(message.timestamp + 24 * 60 * 60 * 1000),
    unreadStaffCount: 1, status: "open", linkStatus: "unlinked", updatedAt: new Date(),
    facebookName: profile.name, facebookAvatarUrl: profile.avatarUrl,
  }, serviceToken, env);
  await writeDocument(`chat_threads/${id}/messages`, message.messageId, {
    direction: "inbound", text: message.text, actorUid: null, status: "received",
    metaMessageId: message.messageId, errorCode: null,
    createdAt: new Date(message.timestamp), updatedAt: new Date(),
  }, serviceToken, env);
}

/** Ma loi Meta doc duoc: object -> JSON (giu "code":190... de client chan doan token), con lai -> chuoi. */
export function metaErrorCode(data: Record<string, unknown>, status: number): string {
  if (data.error && typeof data.error === "object") return JSON.stringify(data.error).slice(0, 200);
  return String(data.error ?? status);
}

async function sendGraph(body: SendBody, env: Env): Promise<{ message_id?: string; recipient_id?: string }> {
  const pageAccessToken = normalizeSecret(env.META_PAGE_ACCESS_TOKEN, "META_PAGE_ACCESS_TOKEN");
  const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
  const request = () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildMessengerPayload(body)) });
  let response = await request();
  if (response.status >= 500 || response.status === 429) {
    // 429: doi theo Retry-After (chan tren 5s) roi thu lai dung 1 lan; 5xx: thu lai ngay.
    if (response.status === 429) {
      const retryAfterSeconds = Math.min(Number(response.headers.get("retry-after")) || 2, 5);
      await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000));
    }
    response = await request();
  }
  const data = await response.json<Record<string, unknown>>();
  if (!response.ok) {
    const metaError = data.error as Record<string, unknown> | undefined;
    if (metaError?.code === 190) {
      console.warn("meta_page_access_token_rejected", {
        tokenLength: pageAccessToken.length,
        status: response.status,
      });
    }
    throw new Error(`meta_${metaErrorCode(data, response.status)}`);
  }
  return data;
}

async function handleSend(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) return new Response(JSON.stringify({ error: "missing_bearer_token" }), { status: 401, headers: corsHeaders(env, request) });
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  const body = await request.json<SendBody>();
  if (!body.text?.trim() || body.text.length > 2000) return new Response(JSON.stringify({ error: "invalid_message" }), { status: 400, headers: corsHeaders(env, request) });
  if (body.tag !== undefined && !isMessengerTagShape(body.tag)) return new Response(JSON.stringify({ error: "invalid_message_tag" }), { status: 400, headers: corsHeaders(env, request) });
  const serviceToken = await serviceAccessToken(env);
  if (!body.studentId && body.recipientPsid) {
    if (profile.role !== "admin") return new Response(JSON.stringify({ error: "admin_required" }), { status: 403, headers: corsHeaders(env, request) });
    const directThreadId = `messenger_unlinked_${body.recipientPsid}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
    const directThread = await readDocument("chat_threads", directThreadId, serviceToken, env);
    if (fieldString(directThread, "messengerPsid") !== body.recipientPsid || fieldString(directThread, "linkStatus") !== "unlinked") {
      return new Response(JSON.stringify({ error: "unlinked_conversation_not_found" }), { status: 404, headers: corsHeaders(env, request) });
    }
    const id = crypto.randomUUID();
    try {
      const result = await sendGraph(body, env);
      const occurredAt = new Date();
      await writeDocument("message_outbox", id, { type: body.type ?? "manual", studentId: null, recipientPsid: body.recipientPsid, content: body.text, status: "sent", messageTag: body.tag ?? null, metaMessageId: result.message_id ?? null, actorUid: claims.sub, createdAt: occurredAt }, serviceToken, env);
      await writeDocument(`chat_threads/${directThreadId}/messages`, result.message_id ?? id, { direction: "outbound", text: body.text, actorUid: claims.sub, status: "sent", metaMessageId: result.message_id ?? null, errorCode: null, createdAt: occurredAt, updatedAt: occurredAt }, serviceToken, env);
      await updateDocumentFields("chat_threads", directThreadId, { lastMessagePreview: body.text.slice(0, 160), lastMessageDirection: "outbound", lastMessageAt: occurredAt, unreadStaffCount: 0, updatedAt: occurredAt }, serviceToken, env);
      return new Response(JSON.stringify({ id, status: "sent", sent: 1, total: 1 }), { headers: corsHeaders(env, request) });
    } catch (error) {
      const code = (error instanceof Error ? error.message : String(error)).slice(0, 240);
      await writeDocument("message_outbox", id, { type: body.type ?? "manual", studentId: null, recipientPsid: body.recipientPsid, content: body.text, status: "failed", messageTag: body.tag ?? null, metaMessageId: null, error: code, actorUid: claims.sub, createdAt: new Date() }, serviceToken, env);
      return new Response(JSON.stringify({ id, status: "failed", sent: 0, total: 1, error: code }), { status: 502, headers: corsHeaders(env, request) });
    }
  }
  if (!body.studentId) return new Response(JSON.stringify({ error: "missing_recipient" }), { status: 400, headers: corsHeaders(env, request) });
  const context = await threadContext(body.studentId, serviceToken, env);
  await assertStudentScope(profile, claims.sub, context);
  const recipients = await resolveRecipients(body.studentId, serviceToken, env);
  if (!recipients.length) return new Response(JSON.stringify({ error: "no_recipient" }), { status: 400, headers: corsHeaders(env, request) });
  const results: Array<{ id: string; status: "sent" | "failed"; error?: string }> = [];
  for (const recipient of recipients) {
    const id = crypto.randomUUID();
    try {
      const result = await sendGraph({ ...body, recipientPsid: recipient.psid }, env);
      await writeDocument("message_outbox", id, { type: body.type ?? "general", studentId: body.studentId, recipientPsid: recipient.psid, content: body.text, status: "sent", messageTag: body.tag ?? null, metaMessageId: result.message_id ?? null, actorUid: claims.sub, createdAt: new Date() }, serviceToken, env);
      if (context) await writeChatEvent({ context, parentUid: recipient.parentUid, direction: "outbound", text: body.text, status: "sent", actorUid: claims.sub, metaMessageId: result.message_id ?? null, errorCode: null, occurredAt: new Date(), threadId: recipient.threadId }, serviceToken, env);
      results.push({ id, status: "sent" });
    } catch (error) {
      const code = (error instanceof Error ? error.message : String(error)).slice(0, 240);
      await writeDocument("message_outbox", id, { type: body.type ?? "general", studentId: body.studentId, recipientPsid: recipient.psid, content: body.text, status: "failed", messageTag: body.tag ?? null, metaMessageId: null, error: code, actorUid: claims.sub, createdAt: new Date() }, serviceToken, env);
      if (context) await writeChatEvent({ context, parentUid: recipient.parentUid, direction: "outbound", text: body.text, status: "failed", actorUid: claims.sub, metaMessageId: null, errorCode: code, occurredAt: new Date(), threadId: recipient.threadId }, serviceToken, env);
      results.push({ id, status: "failed", error: code });
    }
  }
  const sent = results.filter((result) => result.status === "sent").length;
  return new Response(JSON.stringify({ id: results[0].id, status: sent ? "sent" : "failed", sent, total: results.length, results, error: sent ? undefined : results[0].error }), { status: sent ? 200 : 502, headers: corsHeaders(env, request) });
}

async function handleLinkConversation(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) return new Response(JSON.stringify({ error: "missing_bearer_token" }), { status: 401, headers: corsHeaders(env, request) });
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  if (profile.role !== "admin") return new Response(JSON.stringify({ error: "admin_required" }), { status: 403, headers: corsHeaders(env, request) });
  const body = await request.json<LinkConversationBody>();
  if (!body.psid || !body.studentId) return new Response(JSON.stringify({ error: "invalid_link_target" }), { status: 400, headers: corsHeaders(env, request) });
  const serviceToken = await serviceAccessToken(env);
  const student = await readDocument("students", body.studentId, serviceToken, env);
  const parentUid = fieldStringArray(student, "parentUids")[0];
  const context = await threadContext(body.studentId, serviceToken, env);
  if (!parentUid || !context) return new Response(JSON.stringify({ error: "student_parent_required" }), { status: 400, headers: corsHeaders(env, request) });
  const id = `messenger_unlinked_${body.psid}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
  const existing = await readDocument("chat_threads", id, serviceToken, env);
  const pageId = fieldString(existing, "pageId") ?? "";
  await writeDocument("messenger_connections", parentUid, { uid: parentUid, facebookPsid: body.psid, pageId, status: "active", linkedAt: new Date() }, serviceToken, env);
  await writeDocument("messenger_psid_links", body.psid, { uid: parentUid, pageId, status: "active", threadId: id, updatedAt: new Date() }, serviceToken, env);
  await writeDocument("chat_threads", id, {
    channel: "messenger", parentUid, parentName: await parentName(parentUid, serviceToken, env),
    studentId: context.studentId, studentName: context.studentName, classId: context.classId, className: context.className,
    assignedTeacherIds: context.assignedTeacherIds, messengerPsid: body.psid, pageId,
    facebookName: fieldString(existing, "facebookName"),
    facebookAvatarUrl: fieldString(existing, "facebookAvatarUrl"),
    lastMessagePreview: fieldString(existing, "lastMessagePreview") ?? "",
    lastMessageDirection: fieldString(existing, "lastMessageDirection") ?? "inbound",
    lastMessageAt: fieldTimestamp(existing, "lastMessageAt") ?? new Date(),
    responseWindowEndsAt: fieldTimestamp(existing, "responseWindowEndsAt"),
    unreadStaffCount: 0, status: "open", linkStatus: "linked", updatedAt: new Date(),
  }, serviceToken, env);
  return new Response(JSON.stringify({ ok: true, threadId: id }), { headers: corsHeaders(env, request) });
}

export function validPostImages(value: unknown): boolean {
  if (value == null) return true;
  return Array.isArray(value) && value.length <= 4 && value.every((url) => typeof url === "string" && /^https?:\/\//i.test(url));
}

/** Graph API tu choi khi gui ca `link` va `attached_media` trong cung mot bai -> khi co anh, noi link vao cuoi message (van bam duoc). */
export function buildFeedPayload(body: PostBody, photoIds: string[]): Record<string, unknown> {
  const payload: Record<string, unknown> = { message: body.message };
  if (photoIds.length) {
    payload.attached_media = photoIds.map((photoId) => ({ media_fbid: photoId }));
    if (body.link) payload.message = `${body.message}\n${body.link}`;
  } else if (body.link) {
    payload.link = body.link;
  }
  return payload;
}

async function uploadPhoto(imageUrl: string, env: Env): Promise<string> {
  const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/photos?access_token=${encodeURIComponent(env.META_PAGE_ACCESS_TOKEN)}`;
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: imageUrl, published: false }) });
  const data = await response.json<Record<string, unknown>>();
  if (!response.ok || typeof data.id !== "string") throw new Error(`meta_photo_${metaErrorCode(data, response.status)}`);
  return data.id;
}

async function postGraph(body: PostBody, env: Env): Promise<{ id?: string }> {
  const photoIds = await Promise.all((body.imageUrls ?? []).map((imageUrl) => uploadPhoto(imageUrl, env)));
  const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/feed?access_token=${encodeURIComponent(env.META_PAGE_ACCESS_TOKEN)}`;
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildFeedPayload(body, photoIds)) });
  const data = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new Error(`meta_${metaErrorCode(data, response.status)}`);
  return data;
}

async function handlePost(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) return new Response(JSON.stringify({ error: "missing_bearer_token" }), { status: 401, headers: corsHeaders(env) });
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  if (profile.role !== "admin") return new Response(JSON.stringify({ error: "admin_required" }), { status: 403, headers: corsHeaders(env) });
  const body = await request.json<PostBody>();
  if (!body.message?.trim() || body.message.length > 5000) return new Response(JSON.stringify({ error: "invalid_post" }), { status: 400, headers: corsHeaders(env) });
  if (!validPostImages(body.imageUrls)) return new Response(JSON.stringify({ error: "invalid_post_images" }), { status: 400, headers: corsHeaders(env) });
  const serviceToken = await serviceAccessToken(env);
  const id = crypto.randomUUID();
  try {
    const result = await postGraph(body, env);
    await writeDocument("message_outbox", id, { type: "page_post", studentId: null, recipientPsid: "page", content: body.message, status: "sent", metaMessageId: result.id ?? null, actorUid: claims.sub, createdAt: new Date() }, serviceToken, env);
    return new Response(JSON.stringify({ id, status: "sent", postId: result.id }), { headers: corsHeaders(env) });
  } catch (error) {
    await writeDocument("message_outbox", id, { type: "page_post", studentId: null, recipientPsid: "page", content: body.message, status: "failed", error: String(error).slice(0, 240), actorUid: claims.sub, createdAt: new Date() }, serviceToken, env);
    return new Response(JSON.stringify({ id, status: "failed", error: String(error) }), { status: 502, headers: corsHeaders(env) });
  }
}

async function handleCreateReferral(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) return new Response(JSON.stringify({ error: "missing_bearer_token" }), { status: 401, headers: corsHeaders(env) });
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  const body = await request.json<{ parentUid?: string; studentId?: string }>();
  if (!body.parentUid || !/^[A-Za-z0-9_-]{1,128}$/.test(body.parentUid) || !body.studentId || !/^[A-Za-z0-9_-]{1,128}$/.test(body.studentId)) return new Response(JSON.stringify({ error: "invalid_referral_target" }), { status: 400, headers: corsHeaders(env) });
  const serviceToken = await serviceAccessToken(env);
  const parent = await readDocument("users", body.parentUid, serviceToken, env);
  if (fieldString(parent, "role") !== "viewer" || fieldString(parent, "status") !== "active") return new Response(JSON.stringify({ error: "parent_not_found" }), { status: 404, headers: corsHeaders(env) });
  const context = await threadContext(body.studentId, serviceToken, env);
  if (!referralTargetAllowed(profile, claims.sub, fieldStringArray(parent, "studentIds"), body.studentId, context)) return new Response(JSON.stringify({ error: "parent_scope_denied" }), { status: 403, headers: corsHeaders(env) });
  const nonce = randomNonce();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await writeDocument("messenger_link_nonces", nonce, {
    uid: body.parentUid,
    status: "active",
    createdBy: claims.sub,
    createdAt: new Date(),
    expiresAt,
    usedAt: null,
  }, serviceToken, env);
  return new Response(JSON.stringify({ nonce, expiresAt: expiresAt.toISOString() }), { headers: corsHeaders(env) });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.META_WEBHOOK_VERIFY_TOKEN) return new Response(url.searchParams.get("hub.challenge") ?? "");
    return new Response("Forbidden", { status: 403 });
  }
  const raw = await request.text();
  const appSecret = normalizeSecret(env.META_APP_SECRET, "META_APP_SECRET");
  if (!await verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
    let diagnostic: { object?: string; pageId?: string; entryKeys?: string[] } = {};
    try {
      const value = JSON.parse(raw) as { object?: string; entry?: Array<Record<string, unknown>> };
      diagnostic = {
        object: value.object,
        pageId: typeof value.entry?.[0]?.id === "string" ? value.entry[0].id : undefined,
        entryKeys: value.entry?.[0] ? Object.keys(value.entry[0]).sort() : [],
      };
    } catch { /* invalid JSON is already rejected by signature */ }
    console.warn("webhook_signature_invalid", { secretLength: appSecret.length, ...diagnostic });
    return new Response("Invalid signature", { status: 401 });
  }
  const payload = JSON.parse(raw) as unknown;
  const serviceToken = await serviceAccessToken(env);
  const referralLinks = extractReferralLinks(payload);
  const inboundMessages = extractInboundMessages(payload);
  const entries = payload && typeof payload === "object" ? (payload as { entry?: unknown[] }).entry ?? [] : [];
  console.log("webhook_received", {
    entries: entries.length,
    messagingEvents: entries.reduce((count, entry) => count + (
      entry && typeof entry === "object" && Array.isArray((entry as { messaging?: unknown[] }).messaging)
        ? ((entry as { messaging: unknown[] }).messaging.length)
        : 0
    ), 0),
    referrals: referralLinks.length,
    inboundMessages: inboundMessages.length,
  });
  for (const link of referralLinks) {
    await claimReferralNonce(link.nonce, link.psid, link.pageId, serviceToken, env);
  }
  for (const message of inboundMessages) {
    const messengerProfile = await fetchMessengerProfile(message.psid, env);
    const link = await readDocument("messenger_psid_links", message.psid, serviceToken, env);
    const parentUid = fieldString(link, "uid") ?? await findConnectionByPsid(message.psid, serviceToken, env);
    if (!parentUid) {
      await writeUnlinkedInbound(message, messengerProfile, serviceToken, env);
      continue;
    }
    if (!link) await writeDocument("messenger_psid_links", message.psid, { uid: parentUid, pageId: message.pageId, status: "active", updatedAt: new Date() }, serviceToken, env);
    const user = await readDocument("users", parentUid, serviceToken, env);
    const studentId = fieldStringArray(user, "studentIds")[0];
    if (!studentId) continue;
    const context = await threadContext(studentId, serviceToken, env);
    if (context) await writeChatEvent({ context, parentUid, direction: "inbound", text: message.text, status: "received", actorUid: null, metaMessageId: message.messageId, errorCode: null, occurredAt: new Date(message.timestamp), threadId: fieldString(link, "threadId"), messengerProfile }, serviceToken, env);
  }
  return new Response("EVENT_RECEIVED");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    const path = new URL(request.url).pathname;
    try {
      if (path === "/health") return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders(env, request) });
      if (path === "/api/messenger/send" && request.method === "POST") return handleSend(request, env);
      if (path === "/api/messenger/post" && request.method === "POST") return handlePost(request, env);
      if (path === "/api/messenger/referral" && request.method === "POST") return handleCreateReferral(request, env);
      if (path === "/api/messenger/link" && request.method === "POST") return handleLinkConversation(request, env);
      if (path === "/webhook") return handleWebhook(request, env);
      return new Response("Not found", { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders(env, request) });
    }
  },
};
