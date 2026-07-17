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
interface Recipient { psid: string; parentUid: string }
interface ThreadContext {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  assignedTeacherIds: string[];
}
export interface SendBody { recipientPsid?: string; text: string; type?: string; studentId?: string; tag?: string }
interface PostBody { message: string; link?: string }
export interface InboundMessage { psid: string; pageId: string; text: string; messageId: string; timestamp: number }

export function corsHeaders(env: Env) {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "content-type": "application/json",
  };
}

export function extractBearer(value: string | null): string | null {
  return value?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export function isMessengerTagShape(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z_]{3,64}$/.test(value.trim());
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

export function extractReferralLinks(payload: unknown): Array<{ uid: string; psid: string; pageId: string }> {
  const result: Array<{ uid: string; psid: string; pageId: string }> = [];
  if (!payload || typeof payload !== "object") return result;
  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    for (const event of (entry as { messaging?: unknown[] }).messaging ?? []) {
      if (!event || typeof event !== "object") continue;
      const value = event as { sender?: { id?: string }; recipient?: { id?: string }; referral?: { ref?: string }; postback?: { referral?: { ref?: string } } };
      const uid = value.referral?.ref ?? value.postback?.referral?.ref;
      if (uid && value.sender?.id && value.recipient?.id) result.push({ uid, psid: value.sender.id, pageId: value.recipient.id });
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
  const key = await importPKCS8(env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), "RS256");
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

async function resolveRecipients(studentId: string, serviceToken: string, env: Env): Promise<Recipient[]> {
  const student = await readDocument("students", studentId, serviceToken, env);
  const recipients: Recipient[] = [];
  for (const parentUid of fieldStringArray(student, "parentUids")) {
    const connection = await readDocument("messenger_connections", parentUid, serviceToken, env);
    const psid = fieldString(connection, "facebookPsid");
    if (psid && fieldString(connection, "status") === "active") recipients.push({ psid, parentUid });
  }
  return recipients;
}

async function parentName(parentUid: string, serviceToken: string, env: Env): Promise<string> {
  return fieldString(await readDocument("users", parentUid, serviceToken, env), "displayName") ?? "Phụ huynh";
}

function threadId(parentUid: string, studentId: string): string {
  return `messenger_${parentUid}_${studentId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

async function writeChatEvent(input: { context: ThreadContext; parentUid: string; direction: "inbound" | "outbound"; text: string; status: "received" | "sent" | "failed"; actorUid: string | null; metaMessageId: string | null; errorCode: string | null; occurredAt: Date }, serviceToken: string, env: Env): Promise<void> {
  const id = threadId(input.parentUid, input.context.studentId);
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
  }, serviceToken, env);
  await writeDocument(`chat_threads/${id}/messages`, input.metaMessageId ?? crypto.randomUUID(), {
    direction: input.direction, text: input.text, actorUid: input.actorUid,
    status: input.status, metaMessageId: input.metaMessageId, errorCode: input.errorCode,
    createdAt: input.occurredAt, updatedAt: new Date(),
  }, serviceToken, env);
}

async function sendGraph(body: SendBody, env: Env): Promise<{ message_id?: string; recipient_id?: string }> {
  const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(env.META_PAGE_ACCESS_TOKEN)}`;
  const request = () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildMessengerPayload(body)) });
  let response = await request();
  if (response.status >= 500) response = await request();
  const data = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new Error(`meta_${String(data.error ?? response.status)}`);
  return data;
}

async function handleSend(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) return new Response(JSON.stringify({ error: "missing_bearer_token" }), { status: 401, headers: corsHeaders(env) });
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  const body = await request.json<SendBody>();
  if (!body.text?.trim() || body.text.length > 2000 || !body.studentId) return new Response(JSON.stringify({ error: "invalid_message" }), { status: 400, headers: corsHeaders(env) });
  if (body.tag !== undefined && !isMessengerTagShape(body.tag)) return new Response(JSON.stringify({ error: "invalid_message_tag" }), { status: 400, headers: corsHeaders(env) });
  const serviceToken = await serviceAccessToken(env);
  const context = await threadContext(body.studentId, serviceToken, env);
  await assertStudentScope(profile, claims.sub, context);
  const recipients = await resolveRecipients(body.studentId, serviceToken, env);
  if (!recipients.length) return new Response(JSON.stringify({ error: "no_recipient" }), { status: 400, headers: corsHeaders(env) });
  const results: Array<{ id: string; status: "sent" | "failed"; error?: string }> = [];
  for (const recipient of recipients) {
    const id = crypto.randomUUID();
    try {
      const result = await sendGraph({ ...body, recipientPsid: recipient.psid }, env);
      await writeDocument("message_outbox", id, { type: body.type ?? "general", studentId: body.studentId, recipientPsid: recipient.psid, content: body.text, status: "sent", messageTag: body.tag ?? null, metaMessageId: result.message_id ?? null, actorUid: claims.sub, createdAt: new Date() }, serviceToken, env);
      if (context) await writeChatEvent({ context, parentUid: recipient.parentUid, direction: "outbound", text: body.text, status: "sent", actorUid: claims.sub, metaMessageId: result.message_id ?? null, errorCode: null, occurredAt: new Date() }, serviceToken, env);
      results.push({ id, status: "sent" });
    } catch (error) {
      const code = String(error).slice(0, 240);
      await writeDocument("message_outbox", id, { type: body.type ?? "general", studentId: body.studentId, recipientPsid: recipient.psid, content: body.text, status: "failed", messageTag: body.tag ?? null, metaMessageId: null, error: code, actorUid: claims.sub, createdAt: new Date() }, serviceToken, env);
      if (context) await writeChatEvent({ context, parentUid: recipient.parentUid, direction: "outbound", text: body.text, status: "failed", actorUid: claims.sub, metaMessageId: null, errorCode: code, occurredAt: new Date() }, serviceToken, env);
      results.push({ id, status: "failed", error: code });
    }
  }
  const sent = results.filter((result) => result.status === "sent").length;
  return new Response(JSON.stringify({ id: results[0].id, status: sent ? "sent" : "failed", sent, total: results.length, results, error: sent ? undefined : results[0].error }), { status: sent ? 200 : 502, headers: corsHeaders(env) });
}

async function postGraph(body: PostBody, env: Env): Promise<{ id?: string }> {
  const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/feed?access_token=${encodeURIComponent(env.META_PAGE_ACCESS_TOKEN)}`;
  const payload: Record<string, string> = { message: body.message };
  if (body.link) payload.link = body.link;
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new Error(`meta_${String(data.error ?? response.status)}`);
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

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.META_WEBHOOK_VERIFY_TOKEN) return new Response(url.searchParams.get("hub.challenge") ?? "");
    return new Response("Forbidden", { status: 403 });
  }
  const raw = await request.text();
  if (!await verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), env.META_APP_SECRET)) return new Response("Invalid signature", { status: 401 });
  const payload = JSON.parse(raw) as unknown;
  const serviceToken = await serviceAccessToken(env);
  for (const link of extractReferralLinks(payload)) {
    await writeDocument("messenger_connections", link.uid, { uid: link.uid, facebookPsid: link.psid, pageId: link.pageId, status: "active", linkedAt: new Date() }, serviceToken, env);
    await writeDocument("messenger_psid_links", link.psid, { uid: link.uid, pageId: link.pageId, status: "active", updatedAt: new Date() }, serviceToken, env);
  }
  for (const message of extractInboundMessages(payload)) {
    const link = await readDocument("messenger_psid_links", message.psid, serviceToken, env);
    const parentUid = fieldString(link, "uid") ?? await findConnectionByPsid(message.psid, serviceToken, env);
    if (!parentUid) continue;
    if (!link) await writeDocument("messenger_psid_links", message.psid, { uid: parentUid, pageId: message.pageId, status: "active", updatedAt: new Date() }, serviceToken, env);
    const user = await readDocument("users", parentUid, serviceToken, env);
    const studentId = fieldStringArray(user, "studentIds")[0];
    if (!studentId) continue;
    const context = await threadContext(studentId, serviceToken, env);
    if (context) await writeChatEvent({ context, parentUid, direction: "inbound", text: message.text, status: "received", actorUid: null, metaMessageId: message.messageId, errorCode: null, occurredAt: new Date(message.timestamp) }, serviceToken, env);
  }
  return new Response("EVENT_RECEIVED");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });
    const path = new URL(request.url).pathname;
    try {
      if (path === "/health") return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders(env) });
      if (path === "/api/messenger/send" && request.method === "POST") return handleSend(request, env);
      if (path === "/api/messenger/post" && request.method === "POST") return handlePost(request, env);
      if (path === "/webhook") return handleWebhook(request, env);
      return new Response("Not found", { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders(env) });
    }
  },
};
