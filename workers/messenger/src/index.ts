import { decodeProtectedHeader, importPKCS8, importX509, jwtVerify, SignJWT } from "jose";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  META_APP_ID: string;
  META_PAGE_ACCESS_TOKEN: string;
  META_APP_SECRET: string;
  META_WEBHOOK_VERIFY_TOKEN: string;
  META_GRAPH_VERSION: string;
  META_PAGE_ID?: string;
  ALLOWED_ORIGIN: string;
  UTILITY_MESSAGING_ENABLED?: string;
  UTILITY_AUTOMATION_ENABLED?: string;
  RELEASE_SHA?: string;
  CF_VERSION_METADATA?: { id: string; tag: string; timestamp: string };
}

interface FirebaseClaims { sub: string; user_id?: string; email?: string }
interface StaffProfile { role: "admin" | "teacher" }
interface MessengerProfile { name: string | null; avatarUrl: string | null }
interface MetaManagedPage { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }
export type MetaUtilityPermissionStatus = "granted" | "missing" | "unknown";
interface MetaConnectBody { state?: string; pageId?: string; purpose?: "messenger" | "utility_setup" }
interface Recipient { psid: string; parentUid: string }
interface ThreadContext {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  assignedTeacherIds: string[];
}
export type UtilityTemplateKey =
  | "tuition_payment_reminder"
  | "tuition_payment_confirmation"
  | "class_schedule_adjustment"
  | "lesson_feedback_request"
  | "enrollment_confirmation"
  | "parent_account_link_confirmation";
export interface SendBody {
  recipientPsid?: string;
  text?: string;
  type?: string;
  studentId?: string;
  tag?: string;
  deliveryMode?: "response" | "utility";
  templateKey?: UtilityTemplateKey;
  parameters?: Record<string, string>;
}
export interface LinkConversationBody { psid?: string; parentUid?: string; studentId?: string }
export interface DeleteConversationBody { threadId?: string }
export interface InboundMessage { psid: string; pageId: string; text: string; messageId: string; timestamp: number }
export interface UtilityTemplateStatus {
  pageId: string;
  templateId: string | null;
  templateName: string;
  status: string;
  language: string | null;
  reason: string | null;
  timestamp: number;
}
export interface UtilityTemplateSummary extends UtilityTemplateStatus {
  key: UtilityTemplateKey;
  category: string | null;
  parameterCount: number;
  expectedParameterCount: number;
  valid: boolean;
  enabled: boolean;
  updatedAt: string | null;
}

const ALLOWED_MESSENGER_TAGS = new Set([
  "ACCOUNT_UPDATE",
  "CONFIRMED_EVENT_UPDATE",
  "POST_PURCHASE_UPDATE",
]);
export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
] as const;
export const META_UTILITY_OAUTH_SCOPE = "page_utility_messaging";
export const META_WEBHOOK_FIELDS = ["messages", "messaging_postbacks", "messaging_referrals"] as const;
export const META_UTILITY_WEBHOOK_FIELD = "message_template_status_update" as const;
export function metaOAuthScopes(env: Env): readonly string[] {
  return env.UTILITY_MESSAGING_ENABLED === "true" ? [...META_OAUTH_SCOPES, META_UTILITY_OAUTH_SCOPE] : META_OAUTH_SCOPES;
}

function metaOAuthScopesForPurpose(purpose: "messenger" | "utility_setup"): readonly string[] {
  return purpose === "utility_setup" ? [...META_OAUTH_SCOPES, META_UTILITY_OAUTH_SCOPE] : META_OAUTH_SCOPES;
}
export function metaWebhookFields(env: Env): readonly string[] {
  return env.UTILITY_MESSAGING_ENABLED === "true"
    ? [...META_WEBHOOK_FIELDS, META_UTILITY_WEBHOOK_FIELD]
    : META_WEBHOOK_FIELDS;
}
export function metaOAuthErrorMessage(error: string, reason: string): string {
  return error === "access_denied" || reason === "user_denied"
    ? "Facebook chưa cấp quyền cho ứng dụng."
    : "Facebook không thể mở kết nối. Kiểm tra trạng thái App và các quyền đã được Meta duyệt.";
}
export function metaOAuthCompletionErrorMessage(error: string): string {
  return error === "meta_no_managed_pages"
    ? "Không tìm thấy Fanpage được tài khoản này quản lý."
    : error === "meta_webhook_subscription_failed" || error === "meta_webhook_subscription_unverified"
      ? "Không thể đăng ký webhook cho Fanpage. Kiểm tra quyền pages_manage_metadata rồi kết nối lại."
    : "Không thể hoàn tất kết nối Facebook. Vui lòng thử lại.";
}
export function metaUtilityPermissionStatus(data: unknown): MetaUtilityPermissionStatus {
  if (!data || typeof data !== "object" || !Array.isArray((data as { data?: unknown }).data)) return "unknown";
  const permission = (data as { data: Array<{ permission?: unknown; status?: unknown }> }).data
    .find((item) => item?.permission === META_UTILITY_OAUTH_SCOPE);
  return permission?.status === "granted" ? "granted" : "missing";
}

export async function checkMetaUtilityPermission(accessToken: string, env: Env): Promise<MetaUtilityPermissionStatus> {
  const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/permissions`;
  try {
    const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return "unknown";
    return metaUtilityPermissionStatus(await response.json<unknown>());
  } catch {
    return "unknown";
  }
}

export async function subscribePageWebhooks(page: MetaManagedPage, env: Env, purpose?: "messenger" | "utility_setup"): Promise<string[]> {
  const endpoint = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${encodeURIComponent(page.id)}/subscribed_apps`;
  const subscribeUrl = new URL(endpoint);
  const requiredFields = purpose === "utility_setup" || (!purpose && env.UTILITY_MESSAGING_ENABLED === "true")
    ? [...META_WEBHOOK_FIELDS, META_UTILITY_WEBHOOK_FIELD]
    : META_WEBHOOK_FIELDS;
  subscribeUrl.searchParams.set("subscribed_fields", requiredFields.join(","));
  const headers = { authorization: `Bearer ${page.access_token}` };
  const subscribeResponse = await fetch(subscribeUrl, { method: "POST", headers });
  const subscribeData = await subscribeResponse.json<Record<string, unknown>>();
  if (!subscribeResponse.ok || subscribeData.success !== true) throw new Error("meta_webhook_subscription_failed");

  const verifyResponse = await fetch(endpoint, { headers });
  const verifyData = await verifyResponse.json<{ data?: Array<{ id?: string; subscribed_fields?: unknown }> }>();
  const app = (verifyData.data ?? []).find((item) => item.id === env.META_APP_ID);
  const fields = Array.isArray(app?.subscribed_fields)
    ? app.subscribed_fields.filter((field): field is string => typeof field === "string")
    : [];
  if (!verifyResponse.ok || !requiredFields.every((field) => fields.includes(field))) {
    throw new Error("meta_webhook_subscription_unverified");
  }
  return fields;
}
interface UtilityTemplateDefinition {
  metaName: string;
  language: string;
  parameterKeys: string[];
  teacherAllowed: boolean;
  label: string;
}
export const UTILITY_TEMPLATES: Record<UtilityTemplateKey, UtilityTemplateDefinition> = {
  tuition_payment_reminder: {
    metaName: "edumatrix_tuition_payment_reminder_v2_vi",
    language: "vi",
    parameterKeys: ["studentName", "billingPeriod", "amount", "dueDate"],
    teacherAllowed: true,
    label: "Nhắc học phí",
  },
  tuition_payment_confirmation: {
    metaName: "edumatrix_tuition_payment_confirmation_v2_vi",
    language: "vi",
    parameterKeys: ["studentName", "billingPeriod", "amount", "paymentDate", "paymentReference"],
    teacherAllowed: true,
    label: "Thanh toán học phí thành công",
  },
  class_schedule_adjustment: {
    metaName: "edumatrix_class_schedule_adjustment_v2_vi",
    language: "vi",
    parameterKeys: ["className", "studentName", "lessonDate", "lessonTime", "adjustmentNote"],
    teacherAllowed: true,
    label: "Điều chỉnh lịch học",
  },
  lesson_feedback_request: {
    metaName: "edumatrix_lesson_feedback_notice_v2_vi",
    language: "vi",
    parameterKeys: ["className", "studentName", "teacherName"],
    teacherAllowed: true,
    label: "Đánh giá buổi học",
  },
  enrollment_confirmation: {
    metaName: "edumatrix_enrollment_confirmation_v2_vi",
    language: "vi",
    parameterKeys: ["studentName", "courseName", "centerName"],
    teacherAllowed: true,
    label: "Đăng ký học thành công",
  },
  parent_account_link_confirmation: {
    metaName: "edumatrix_parent_account_link_confirmation_v2_vi",
    language: "vi",
    parameterKeys: ["parentEmail", "studentName"],
    teacherAllowed: false,
    label: "Liên kết tài khoản phụ huynh thành công",
  },
};
const CACHE_REFRESH_MARGIN_MS = 5 * 60 * 1000;
let firebaseCertCache: { certs: Record<string, string>; expiresAt: number } | null = null;
let serviceTokenCache: { key: string; token: string; expiresAt: number } | null = null;
let dynamicPageTokenCache: { token: string; pageId: string; expiresAt: number } | null = null;

// "*" bị loại ngay từ khâu phân tích: một origin ký tự đại diện cho phép mọi
// trang web gọi Worker kèm credential của người dùng (sự cố P1, báo cáo 24/07).
// Nếu ALLOWED_ORIGIN bị đặt sai thành "*", danh sách rỗng và CORS đóng lại -
// hỏng an toàn thay vì mở toang.
function parseAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "" && origin !== "*");
}

function allowedOrigin(request: Request, env: Env): string | null {
  const requestOrigin = request.headers.get("origin");
  const configuredOrigins = parseAllowedOrigins(env);
  return requestOrigin && configuredOrigins.includes(requestOrigin)
    ? requestOrigin
    : null;
}

export function corsHeaders(env: Env, request?: Request) {
  const headers: Record<string, string> = {
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "vary": "Origin",
    "content-type": "application/json",
  };
  const origin = request ? allowedOrigin(request, env) : parseAllowedOrigins(env)[0] ?? null;
  if (origin) headers["access-control-allow-origin"] = origin;
  return headers;
}

export function extractBearer(value: string | null): string | null {
  return value?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export function isMessengerTagShape(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_MESSENGER_TAGS.has(value.trim());
}

export function publicErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("\"code\":190")) return "meta_token_invalid";
  if (message === "meta_oauth_state_expired") return message;
  if (message.startsWith("meta_")) return "meta_request_failed";
  const known = new Set([
    "admin_required",
    "firebase_keys_unavailable",
    "firestore_write_failed",
    "firestore_delete_failed",
    "invalid_thread_id",
    "invalid_message",
    "invalid_message_tag",
    "invalid_delivery_job",
    "utility_disabled",
    "utility_parameters_invalid",
    "utility_template_not_allowed",
    "utility_template_not_approved",
    "missing_bearer_token",
    "missing_recipient",
    "no_recipient",
    "origin_not_allowed",
    "parent_scope_denied",
    "service_auth_failed",
    "staff_required",
    "student_not_found",
    "student_scope_denied",
    "unlinked_conversation_not_found",
    "conversation_not_found",
    "delivery_job_not_found",
    "meta_oauth_state_expired",
    "viewer_required",
  ]);
  return known.has(message) ? message : "internal_error";
}

function errorStatus(error: unknown): number {
  const code = publicErrorCode(error);
  if (code === "missing_bearer_token") return 401;
  if (code === "admin_required" || code === "staff_required" || code === "viewer_required" || code === "origin_not_allowed") return 403;
  if (["invalid_thread_id", "invalid_delivery_job", "utility_template_not_allowed", "utility_template_not_approved", "meta_oauth_state_expired"].includes(code)) return 400;
  if (["conversation_not_found", "delivery_job_not_found"].includes(code)) return 404;
  return 500;
}

function logEvent(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown>): void {
  const entry = JSON.stringify({ event, ...fields });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

function normalizeSecret(value: string, key: string): string {
  let normalized = value.trim().replace(new RegExp(`^${key}\\s*=\\s*`), "").trim();
  if (normalized.startsWith("\"") && normalized.endsWith("\"")) {
    try { normalized = JSON.parse(normalized) as string; } catch { /* keep original */ }
  }
  return normalized.trim();
}

export function utilityTemplate(body: SendBody): UtilityTemplateDefinition | null {
  return body.templateKey ? UTILITY_TEMPLATES[body.templateKey] ?? null : null;
}

export function validUtilityParameters(body: SendBody): boolean {
  const template = utilityTemplate(body);
  if (!template || !body.parameters || typeof body.parameters !== "object" || Array.isArray(body.parameters)) return false;
  const keys = Object.keys(body.parameters).sort();
  const expected = [...template.parameterKeys].sort();
  return keys.length === expected.length
    && keys.every((key, index) => key === expected[index])
    && template.parameterKeys.every((key) => {
      const value = body.parameters?.[key];
      return typeof value === "string" && value.trim().length > 0 && value.length <= 500;
    });
}

export function buildUtilityPayload(body: SendBody): Record<string, unknown> {
  const template = utilityTemplate(body);
  if (!template || !validUtilityParameters(body)) throw new Error("utility_parameters_invalid");
  return {
    recipient: { id: body.recipientPsid },
    messaging_type: "UTILITY",
    message: {
      template: {
        name: template.metaName,
        language: { code: template.language },
        components: [{
          type: "body",
          parameters: template.parameterKeys.map((key) => ({ type: "text", text: body.parameters?.[key] })),
        }],
      },
    },
  };
}

export function buildMessengerPayload(body: SendBody): Record<string, unknown> {
  if (body.deliveryMode === "utility") return buildUtilityPayload(body);
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

export function extractUtilityTemplateStatuses(payload: unknown): UtilityTemplateStatus[] {
  const result: UtilityTemplateStatus[] = [];
  if (!payload || typeof payload !== "object") return result;
  for (const entry of (payload as { entry?: unknown[] }).entry ?? []) {
    if (!entry || typeof entry !== "object") continue;
    const pageId = typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : "";
    const timestamp = typeof (entry as { time?: unknown }).time === "number" ? (entry as { time: number }).time * 1000 : Date.now();
    for (const change of (entry as { changes?: unknown[] }).changes ?? []) {
      if (!change || typeof change !== "object") continue;
      const field = (change as { field?: unknown }).field;
      if (field !== "message_template_status_update" && field !== "messenger_template_status_update") continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object") continue;
      const data = value as Record<string, unknown>;
      const templateName = [data.message_template_name, data.name].find((item): item is string => typeof item === "string") ?? "";
      const status = [data.event, data.message_template_status, data.status].find((item): item is string => typeof item === "string") ?? "";
      if (!pageId || !templateName || !status) continue;
      result.push({
        pageId,
        templateId: typeof data.message_template_id === "string" ? data.message_template_id : null,
        templateName,
        status,
        language: typeof data.message_template_language === "string" ? data.message_template_language : typeof data.language === "string" ? data.language : null,
        reason: typeof data.reason === "string" ? data.reason.slice(0, 240) : null,
        timestamp,
      });
    }
  }
  return result;
}

async function verifyFirebaseToken(token: string, env: Env): Promise<FirebaseClaims> {
  const header = decodeProtectedHeader(token);
  if (header.alg !== "RS256" || !header.kid) throw new Error("invalid_token_header");
  const certs = await firebaseCertificates();
  const cert = certs[header.kid];
  if (!cert) throw new Error("unknown_token_key");
  const key = await importX509(cert, "RS256");
  const { payload } = await jwtVerify(token, key, { audience: env.FIREBASE_PROJECT_ID, issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, algorithms: ["RS256"] });
  if (!payload.sub) throw new Error("missing_uid");
  return payload as unknown as FirebaseClaims;
}

function cacheMaxAge(response: Response, fallbackSeconds: number): number {
  const maxAge = response.headers.get("cache-control")?.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1];
  return (Number(maxAge) || fallbackSeconds) * 1000;
}

export async function firebaseCertificates(): Promise<Record<string, string>> {
  const now = Date.now();
  if (firebaseCertCache && firebaseCertCache.expiresAt - CACHE_REFRESH_MARGIN_MS > now) return firebaseCertCache.certs;
  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error("firebase_keys_unavailable");
  const certs = await response.json<Record<string, string>>();
  firebaseCertCache = { certs, expiresAt: now + cacheMaxAge(response, 60 * 60) };
  return certs;
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

function decodeFirestoreValue(value: Record<string, unknown> | undefined): unknown {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if (typeof value.integerValue === "string") return Number(value.integerValue);
  if (typeof value.doubleValue === "number") return value.doubleValue;
  if (typeof value.timestampValue === "string") return new Date(value.timestampValue);
  const arrayValues = (value.arrayValue as { values?: Array<Record<string, unknown>> } | undefined)?.values;
  if (arrayValues) return arrayValues.map(decodeFirestoreValue);
  const mapFields = (value.mapValue as { fields?: Record<string, Record<string, unknown>> } | undefined)?.fields;
  if (mapFields) return Object.fromEntries(Object.entries(mapFields).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  return null;
}

function decodeFirestoreDocument(document: unknown): Record<string, unknown> {
  const fields = (document as { fields?: Record<string, Record<string, unknown>> } | null)?.fields ?? {};
  return { id: firestoreDocumentId(document) ?? "", ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])) };
}

export function latestUtilityTemplateStatus(
  documents: unknown[],
  template: UtilityTemplateDefinition,
  pageId: string,
): string | null {
  const latest = documents
    .filter((document) => fieldString(document, "pageId") === pageId
      && fieldString(document, "templateName") === template.metaName
      && fieldString(document, "language") === template.language)
    .sort((left, right) => (fieldTimestamp(right, "updatedAt")?.getTime() ?? 0)
      - (fieldTimestamp(left, "updatedAt")?.getTime() ?? 0))[0];
  return fieldString(latest, "status")?.trim().toUpperCase() ?? null;
}

function fieldInteger(document: unknown, name: string): number {
  const value = (document as { fields?: Record<string, { integerValue?: string; doubleValue?: number }> })?.fields?.[name];
  const parsed = Number(value?.integerValue ?? value?.doubleValue ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function nextUnreadStaffCount(document: unknown, direction: "inbound" | "outbound"): number {
  return direction === "inbound" ? fieldInteger(document, "unreadStaffCount") + 1 : 0;
}

export async function serviceAccessToken(env: Env): Promise<string> {
  const cacheKey = `${env.FIREBASE_PROJECT_ID}:${env.FIREBASE_CLIENT_EMAIL}`;
  const now = Date.now();
  if (serviceTokenCache?.key === cacheKey && serviceTokenCache.expiresAt - CACHE_REFRESH_MARGIN_MS > now) return serviceTokenCache.token;
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
  const data = await response.json<{ access_token: string; expires_in?: number }>();
  const token = String(data.access_token);
  serviceTokenCache = { key: cacheKey, token, expiresAt: now + (Number(data.expires_in) || 3600) * 1000 };
  return token;
}

export function resetFirebaseCachesForTest(): void {
  firebaseCertCache = null;
  serviceTokenCache = null;
  dynamicPageTokenCache = null;
}

async function readDocument(collectionId: string, id: string, token: string, env: Env): Promise<unknown | null> {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${token}` } });
  return response.ok ? response.json() : null;
}

function firestoreDocumentId(document: unknown): string | null {
  const name = (document as { name?: unknown } | null)?.name;
  if (typeof name !== "string") return null;
  return name.split("/").pop() || null;
}

async function queryDocuments(
  collectionId: string,
  token: string,
  env: Env,
  filter?: { fieldPath: string; op: "EQUAL" | "ARRAY_CONTAINS"; value: string },
): Promise<unknown[]> {
  const baseQuery: Record<string, unknown> = {
    from: [{ collectionId }],
    limit: 200,
  };
  if (filter) {
    baseQuery.where = {
      fieldFilter: {
        field: { fieldPath: filter.fieldPath },
        op: filter.op,
        value: { stringValue: filter.value },
      },
    };
  }
  const documents: unknown[] = [];
  for (let offset = 0; ; offset += 200) {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ structuredQuery: { ...baseQuery, offset } }),
    });
    if (!response.ok) throw new Error("firestore_query_failed");
    const rows = await response.json<Array<{ document?: unknown }>>();
    const page = rows.flatMap((row) => row.document ? [row.document] : []);
    documents.push(...page);
    if (page.length < 200) return documents;
  }
}

async function enabledUtilityTemplateKeys(token: string, env: Env): Promise<string[]> {
  return fieldStringArray(await readDocument("settings", "integrations", token, env), "messengerUtilityEnabledTemplates");
}

async function utilityTemplateAllowed(templateKey: UtilityTemplateKey, template: UtilityTemplateDefinition, pageId: string, token: string, env: Env): Promise<boolean> {
  if (!(await enabledUtilityTemplateKeys(token, env)).includes(templateKey)) return false;
  const documents = await queryDocuments("messenger_template_status", token, env, { fieldPath: "templateName", op: "EQUAL", value: template.metaName });
  const latest = documents.filter((document) => fieldString(document, "pageId") === pageId && fieldString(document, "language") === template.language)
    .sort((left, right) => (fieldTimestamp(right, "updatedAt")?.getTime() ?? 0) - (fieldTimestamp(left, "updatedAt")?.getTime() ?? 0))[0];
  return fieldString(latest, "status")?.toUpperCase() === "APPROVED"
    && fieldString(latest, "category") === "UTILITY"
    && fieldInteger(latest, "parameterCount") === template.parameterKeys.length;
}

function utilityTemplateKeyByName(name: string): UtilityTemplateKey | null {
  return (Object.entries(UTILITY_TEMPLATES) as Array<[UtilityTemplateKey, UtilityTemplateDefinition]>)
    .find(([, definition]) => definition.metaName === name)?.[0] ?? null;
}

function templateParameterCount(components: unknown): number {
  const matches = JSON.stringify(components ?? []).match(/\{\{\s*(\d+)\s*\}\}/g) ?? [];
  return new Set(matches.map((match) => match.replace(/\D/g, ""))).size;
}

async function utilityTemplateSummaries(token: string, env: Env): Promise<UtilityTemplateSummary[]> {
  const pageId = (await configuredPageAccess(env)).pageId;
  const [documents, enabled] = await Promise.all([
    queryDocuments("messenger_template_status", token, env),
    enabledUtilityTemplateKeys(token, env),
  ]);
  return (Object.entries(UTILITY_TEMPLATES) as Array<[UtilityTemplateKey, UtilityTemplateDefinition]>).map(([key, definition]) => {
    const latest = documents.filter((document) => fieldString(document, "pageId") === pageId
      && fieldString(document, "templateName") === definition.metaName
      && fieldString(document, "language") === definition.language)
      .sort((left, right) => (fieldTimestamp(right, "updatedAt")?.getTime() ?? 0) - (fieldTimestamp(left, "updatedAt")?.getTime() ?? 0))[0];
    const parameterCount = fieldInteger(latest, "parameterCount");
    const category = fieldString(latest, "category") ?? null;
    const status = fieldString(latest, "status")?.toUpperCase() ?? "MISSING";
    const valid = status === "APPROVED" && category === "UTILITY" && parameterCount === definition.parameterKeys.length;
    return {
      key, pageId, templateId: fieldString(latest, "templateId") ?? null, templateName: definition.metaName,
      status, language: definition.language, reason: fieldString(latest, "reason") ?? null,
      timestamp: fieldTimestamp(latest, "updatedAt")?.getTime() ?? 0,
      category, parameterCount, expectedParameterCount: definition.parameterKeys.length,
      valid, enabled: valid && enabled.includes(key), updatedAt: fieldTimestamp(latest, "updatedAt")?.toISOString() ?? null,
    };
  });
}

function firestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: firestoreFields(value as Record<string, unknown>) } };
  return { stringValue: String(value) };
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

export function validChatThreadId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,180}$/.test(value);
}

async function listConversationMessageNames(threadId: string, token: string, env: Env): Promise<string[]> {
  const names: string[] = [];
  let pageToken = "";
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/chat_threads/${encodeURIComponent(threadId)}/messages`);
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("firestore_delete_failed");
    const data = await response.json<{ documents?: Array<{ name?: string }>; nextPageToken?: string }>();
    names.push(...(data.documents ?? []).flatMap((document) => document.name ? [document.name] : []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return names;
}

async function commitDocumentDeletes(names: string[], token: string, env: Env): Promise<void> {
  for (let offset = 0; offset < names.length; offset += 500) {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ writes: names.slice(offset, offset + 500).map((name) => ({ delete: name })) }),
    });
    if (!response.ok) throw new Error("firestore_delete_failed");
  }
}

const CONVERSATION_TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function startDeleteChatConversation(threadId: string, deletedBy: string, token: string, env: Env): Promise<void> {
  if (!validChatThreadId(threadId)) throw new Error("invalid_thread_id");
  const thread = await readDocument("chat_threads", threadId, token, env);
  if (!thread) throw new Error("conversation_not_found");
  const now = new Date();
  const tombstone = await readDocument("messenger_conversation_tombstones", threadId, token, env);
  if (fieldString(tombstone, "status") === "deleting" || fieldString(tombstone, "status") === "deleted") return;
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ writes: [
      {
        update: { name: documentName("chat_threads", threadId, env), fields: firestoreFields({ deletionState: "deleting", updatedAt: now }) },
        updateMask: { fieldPaths: ["deletionState", "updatedAt"] },
      },
      {
        update: { name: documentName("messenger_conversation_tombstones", threadId, env), fields: firestoreFields({ status: "deleting", threadId, deletedBy, startedAt: now, completedAt: null, expiresAt: new Date(now.getTime() + CONVERSATION_TOMBSTONE_TTL_MS), deletedMessages: 0 }) },
        currentDocument: { exists: false },
      },
      auditWrite("messenger_conversation_delete_started", deletedBy, { threadId }, env, now),
    ] }),
  });
  if (!response.ok && response.status !== 409) throw new Error("firestore_delete_failed");
}

async function processConversationDeletion(threadId: string, tombstone: unknown, token: string, env: Env): Promise<number> {
  const messageNames = await listConversationMessageNames(threadId, token, env);
  if (messageNames.length) {
    await commitDocumentDeletes(messageNames.slice(0, 500), token, env);
    const deletedMessages = fieldInteger(tombstone, "deletedMessages") + Math.min(messageNames.length, 500);
    await updateDocumentFields("messenger_conversation_tombstones", threadId, { deletedMessages, lastAttemptAt: new Date() }, token, env);
    return Math.min(messageNames.length, 500);
  }
  const now = new Date();
  const deletedBy = fieldString(tombstone, "deletedBy") ?? "system";
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ writes: [
      { delete: documentName("chat_threads", threadId, env) },
      {
        update: { name: documentName("messenger_conversation_tombstones", threadId, env), fields: firestoreFields({ status: "deleted", completedAt: now, lastAttemptAt: now }) },
        updateMask: { fieldPaths: ["status", "completedAt", "lastAttemptAt"] },
      },
      auditWrite("messenger_conversation_deleted", deletedBy, { threadId }, env, now),
    ] }),
  });
  if (!response.ok) throw new Error("firestore_delete_failed");
  return 0;
}

function documentUpdateTime(document: unknown): string | undefined {
  return (document as { updateTime?: string } | null)?.updateTime;
}

function documentName(collectionId: string, id: string, env: Env): string {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${id}`;
}

function auditWrite(action: string, actorUid: string, metadata: Record<string, unknown>, env: Env, now = new Date()): Record<string, unknown> {
  return {
    update: {
      name: documentName("audit_logs", crypto.randomUUID(), env),
      fields: firestoreFields({ action, actorUid, metadata, createdAt: now, source: "messenger-worker" }),
    },
    currentDocument: { exists: false },
  };
}

export function deliveryJobId(eventType: string, entityId: string, version: string, parentUid: string): string {
  return `${eventType}:${entityId}:${version}:${parentUid}`.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 500);
}

export function deliveryJobEligible(job: unknown, now = Date.now()): boolean {
  const status = fieldString(job, "status");
  const attempts = fieldInteger(job, "attempts");
  const due = fieldTimestamp(job, "nextAttemptAt")?.getTime() ?? 0;
  const leaseExpired = (fieldTimestamp(job, "leaseUntil")?.getTime() ?? 0) <= now;
  return attempts < 3 && (((status === "pending" || status === "failed") && due <= now) || (status === "processing" && leaseExpired));
}

function deliveryJobWrite(input: {
  eventType: string;
  entityId: string;
  version: string;
  parentUid: string;
  studentId: string;
  templateKey: UtilityTemplateKey;
  parameters: Record<string, string>;
}, env: Env, now = new Date()): Record<string, unknown> {
  const idempotencyKey = `${input.eventType}:${input.entityId}:${input.version}:${input.parentUid}`;
  return {
    update: {
      name: documentName("messenger_delivery_jobs", deliveryJobId(input.eventType, input.entityId, input.version, input.parentUid), env),
      fields: firestoreFields({ ...input, idempotencyKey, parametersJson: JSON.stringify(input.parameters), status: "pending", attempts: 0, lastErrorCode: null, metaMessageId: null, leaseUntil: null, nextAttemptAt: now, createdAt: now, updatedAt: now }),
    },
    currentDocument: { exists: false },
  };
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function oauthStateActive(document: unknown, expectedUid?: string, now = new Date()): boolean {
  const expiresAt = fieldTimestamp(document, "expiresAt");
  return Boolean(document)
    && (!expectedUid || fieldString(document, "uid") === expectedUid)
    && Boolean(expiresAt && expiresAt.getTime() > now.getTime());
}

export function referralClaimUid(
  nonceDocument: unknown,
  existingConnection: unknown,
  existingPsidLink: unknown,
  psid: string,
  now = new Date(),
): string | null {
  const uid = fieldString(nonceDocument, "parentUid");
  const studentId = fieldString(nonceDocument, "studentId");
  const expiresAt = fieldTimestamp(nonceDocument, "expiresAt");
  if (!uid || !studentId || fieldString(nonceDocument, "status") !== "active" || !expiresAt || expiresAt.getTime() <= now.getTime()) return null;
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
  const targetUid = fieldString(nonceDocument, "parentUid");
  const studentId = fieldString(nonceDocument, "studentId");
  if (!targetUid || !studentId) return false;
  const [existingConnection, existingPsidLink, parent, student] = await Promise.all([
    readDocument("messenger_connections", targetUid, token, env),
    readDocument("messenger_psid_links", psid, token, env),
    readDocument("users", targetUid, token, env),
    readDocument("students", studentId, token, env),
  ]);
  if (!fieldStringArray(parent, "studentIds").includes(studentId) || !fieldStringArray(student, "parentUids").includes(targetUid)) return false;
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
      update: { name: documentName("messenger_connections", uid, env), fields: firestoreFields({ uid, facebookPsid: psid, pageId, activeStudentId: studentId, status: "active", linkedAt: now }) },
      updateMask: { fieldPaths: ["uid", "facebookPsid", "pageId", "activeStudentId", "status", "linkedAt"] },
      currentDocument: connectionPrecondition,
    },
    {
      update: { name: documentName("messenger_psid_links", psid, env), fields: firestoreFields({ uid, pageId, activeStudentId: studentId, status: "active", updatedAt: now }) },
      updateMask: { fieldPaths: ["uid", "pageId", "activeStudentId", "status", "updatedAt"] },
      currentDocument: psidPrecondition,
    },
    auditWrite("messenger_linked", uid, { studentId, pageId }, env, now),
    deliveryJobWrite({
      eventType: "parent_student_linked", entityId: nonce, version: "1", parentUid: uid, studentId,
      templateKey: "parent_account_link_confirmation",
      parameters: { parentEmail: fieldString(parent, "email") ?? "", studentName: fieldString(student, "fullName") ?? studentId },
    }, env, now),
  ];
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  return response.ok;
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
  let classId = "";
  let classDoc: unknown | null = null;
  for (const candidateId of fieldStringArray(student, "currentClassIds")) {
    const candidate = await readDocument("classes", candidateId, serviceToken, env);
    if (candidate) {
      classId = candidateId;
      classDoc = candidate;
      break;
    }
  }
  return {
    studentId,
    studentName: fieldString(student, "fullName") ?? studentId,
    classId,
    className: fieldString(classDoc, "name") ?? "Chưa xếp lớp",
    assignedTeacherIds: fieldStringArray(student, "teacherIds"),
  };
}

async function syncThreadContexts(profile: StaffProfile, uid: string, serviceToken: string, env: Env): Promise<number> {
  const threadDocuments = profile.role === "admin"
    ? await queryDocuments("chat_threads", serviceToken, env)
    : (await Promise.all(
        (await queryDocuments("students", serviceToken, env, {
          fieldPath: "teacherIds",
          op: "ARRAY_CONTAINS",
          value: uid,
        })).map(async (student) => {
          const studentId = firestoreDocumentId(student);
          return studentId
            ? queryDocuments("chat_threads", serviceToken, env, { fieldPath: "studentId", op: "EQUAL", value: studentId })
            : [];
        }),
      )).flat();
  const uniqueThreads = new Map(threadDocuments.flatMap((thread) => {
    const id = firestoreDocumentId(thread);
    return id ? [[id, thread] as const] : [];
  }));
  let updated = 0;
  for (const [id, thread] of uniqueThreads) {
    const studentId = fieldString(thread, "studentId");
    if (!studentId) continue;
    const context = await threadContext(studentId, serviceToken, env);
    if (!context) continue;
    await updateDocumentFields("chat_threads", id, {
      studentName: context.studentName,
      classId: context.classId,
      className: context.className,
      assignedTeacherIds: context.assignedTeacherIds,
      updatedAt: new Date(),
    }, serviceToken, env);
    updated += 1;
  }
  return updated;
}

async function handleSyncConversationContexts(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) return new Response(JSON.stringify({ error: "missing_bearer_token" }), { status: 401, headers: corsHeaders(env, request) });
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  const serviceToken = await serviceAccessToken(env);
  const updated = await syncThreadContexts(profile, claims.sub, serviceToken, env);
  return new Response(JSON.stringify({ ok: true, updated }), { headers: corsHeaders(env, request) });
}

function valueStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function materializeViewerDashboard(parentUid: string, token: string, env: Env): Promise<Record<string, unknown>> {
  const parent = await readDocument("users", parentUid, token, env);
  const studentIds = fieldStringArray(parent, "studentIds");
  const students = (await Promise.all(studentIds.map((id) => readDocument("students", id, token, env))))
    .filter(Boolean).map(decodeFirestoreDocument);
  const classIds = [...new Set(students.flatMap((student) => valueStrings(student.currentClassIds)))];
  const classes = (await Promise.all(classIds.map((id) => readDocument("classes", id, token, env))))
    .filter(Boolean).map(decodeFirestoreDocument);
  const courseIds = [...new Set(classes.flatMap((klass) => typeof klass.courseId === "string" ? [klass.courseId] : []))];
  const courses = (await Promise.all(courseIds.map((id) => readDocument("courses", id, token, env))))
    .filter(Boolean).map(decodeFirestoreDocument);
  const byField = async (collectionId: string, fieldPath: string, ids: string[], perId: number) => (await Promise.all(ids.map(async (id) => (
    await queryDocuments(collectionId, token, env, { fieldPath, op: "EQUAL", value: id })
  ).slice(0, perId).map(decodeFirestoreDocument)))).flat();
  const [sessions, lessonPlans, assignments, submissions, scores, attendance, invoices, announcements] = await Promise.all([
    byField("sessions", "classId", classIds, 12),
    byField("lesson_plan_public", "classId", classIds, 12),
    byField("assignments", "classId", classIds, 25),
    byField("submissions", "studentId", studentIds, 100),
    byField("scores", "studentId", studentIds, 10),
    byField("attendance", "studentId", studentIds, 50),
    byField("invoices", "studentId", studentIds, 30),
    byField("announcements", "studentId", studentIds, 10),
  ]);
  const submitted = new Set(submissions.flatMap((submission) => typeof submission.assignmentId === "string" ? [submission.assignmentId] : []));
  const dashboard = {
    studentIds, students, classes, courses, assignments, submissions, scores,
    attendanceHistory: attendance,
    nextSessions: sessions,
    lessonPlans,
    pendingAssignments: assignments.filter((assignment) => !submitted.has(String(assignment.id))),
    latestScores: scores,
    attendance,
    unpaidInvoices: invoices.filter((invoice) => invoice.status !== "paid"),
    announcements,
    updatedAt: new Date(),
  };
  await writeDocument("viewer_dashboard", parentUid, dashboard, token, env);
  return dashboard;
}

async function handleRefreshViewerDashboard(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) throw new Error("missing_bearer_token");
  const claims = await verifyFirebaseToken(idToken, env);
  const serviceToken = await serviceAccessToken(env);
  const user = await readDocument("users", claims.sub, serviceToken, env);
  if (fieldString(user, "role") !== "viewer" || fieldString(user, "status") !== "active") throw new Error("viewer_required");
  const current = await readDocument("viewer_dashboard", claims.sub, serviceToken, env);
  const updatedAt = fieldTimestamp(current, "updatedAt");
  if (!updatedAt || Date.now() - updatedAt.getTime() > 5 * 60 * 1000) await materializeViewerDashboard(claims.sub, serviceToken, env);
  return new Response(JSON.stringify({ ok: true, refreshedAt: new Date().toISOString() }), { headers: corsHeaders(env, request) });
}

async function handleDeleteConversation(request: Request, env: Env): Promise<Response> {
  const claims = await requireAdminRequest(request, env);
  const body = await request.json<DeleteConversationBody>();
  if (!validChatThreadId(body.threadId)) throw new Error("invalid_thread_id");
  await startDeleteChatConversation(body.threadId, claims.sub, await serviceAccessToken(env), env);
  return new Response(JSON.stringify({ ok: true, status: "deleting" }), { status: 202, headers: corsHeaders(env, request) });
}

export async function assertStudentScope(profile: StaffProfile, uid: string, context: ThreadContext | null): Promise<void> {
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
    if (psid && fieldString(connection, "status") === "active" && fieldString(connection, "activeStudentId") === studentId) {
      const link = await readDocument("messenger_psid_links", psid, serviceToken, env);
      if (fieldString(link, "uid") === parentUid && fieldString(link, "status") === "active" && fieldString(link, "activeStudentId") === studentId) {
        recipients.push({ psid, parentUid });
      }
    }
  }
  return recipients;
}

async function parentName(parentUid: string, serviceToken: string, env: Env): Promise<string> {
  return fieldString(await readDocument("users", parentUid, serviceToken, env), "displayName") ?? "Phụ huynh";
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

async function tokenEncryptionKey(env: Env): Promise<CryptoKey> {
  const secret = normalizeSecret(env.META_APP_SECRET, "META_APP_SECRET");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`edumatrix-meta-page-token:${secret}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptPrivateValue(value: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await tokenEncryptionKey(env), new TextEncoder().encode(value));
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

async function decryptPrivateValue(value: string, env: Env): Promise<string> {
  const [iv, encrypted] = value.split(".");
  if (!iv || !encrypted) throw new Error("meta_private_config_invalid");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, await tokenEncryptionKey(env), fromBase64Url(encrypted));
  return new TextDecoder().decode(decrypted);
}

export function safeConnectOrigin(value: string | undefined, env: Env): string {
  const configured = env.ALLOWED_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (!value || !configured.includes(value)) throw new Error("origin_not_allowed");
  return value;
}

async function configuredPageAccess(env: Env): Promise<{ token: string; pageId: string }> {
  if (dynamicPageTokenCache && dynamicPageTokenCache.expiresAt > Date.now()) return dynamicPageTokenCache;
  try {
    const serviceToken = await serviceAccessToken(env);
    const privateConfig = await readDocument("messenger_private_config", "page", serviceToken, env);
    const encryptedToken = fieldString(privateConfig, "encryptedPageAccessToken");
    const pageId = fieldString(privateConfig, "pageId") ?? "";
    if (encryptedToken && pageId) {
      const token = await decryptPrivateValue(encryptedToken, env);
      dynamicPageTokenCache = { token, pageId, expiresAt: Date.now() + 5 * 60 * 1000 };
      return dynamicPageTokenCache;
    }
  } catch (error) {
    logEvent("warn", "dynamic_page_config_unavailable", { errorCode: publicErrorCode(error) });
  }
  return {
    token: normalizeSecret(env.META_PAGE_ACCESS_TOKEN, "META_PAGE_ACCESS_TOKEN"),
    pageId: env.META_PAGE_ID?.trim() ?? "",
  };
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
  const pageAccessToken = (await configuredPageAccess(env)).token;
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${encodeURIComponent(psid)}`);
  url.searchParams.set("fields", "first_name,last_name,profile_pic");
  const response = await fetch(url, { headers: { authorization: `Bearer ${pageAccessToken}` } });
  if (!response.ok) {
    logEvent("warn", "messenger_profile_unavailable", { psidSuffix: psid.slice(-4), status: response.status });
    return { name: null, avatarUrl: null };
  }
  return parseMessengerProfile(await response.json<Record<string, unknown>>());
}

export function threadId(parentUid: string, studentId: string): string {
  return `messenger_${parentUid}_${studentId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

async function writeChatEvent(input: { context: ThreadContext; parentUid: string; direction: "inbound" | "outbound"; text: string; status: "received" | "sent" | "failed"; actorUid: string | null; metaMessageId: string | null; errorCode: string | null; occurredAt: Date; messengerProfile?: MessengerProfile }, serviceToken: string, env: Env): Promise<boolean> {
  const id = threadId(input.parentUid, input.context.studentId);
  const tombstone = await readDocument("messenger_conversation_tombstones", id, serviceToken, env);
  if (["deleting", "deleted"].includes(fieldString(tombstone, "status") ?? "")) return false;
  const parent = await parentName(input.parentUid, serviceToken, env);
  const existingThread = await readDocument("chat_threads", id, serviceToken, env);
  const responseWindowEndsAt = input.direction === "inbound"
    ? new Date(input.occurredAt.getTime() + 24 * 60 * 60 * 1000)
    : fieldTimestamp(existingThread, "responseWindowEndsAt");
  const threadFields = {
    channel: "messenger", parentUid: input.parentUid, parentName: parent,
    studentId: input.context.studentId, studentName: input.context.studentName,
    classId: input.context.classId, className: input.context.className,
    assignedTeacherIds: input.context.assignedTeacherIds,
    lastMessagePreview: input.text.slice(0, 160), lastMessageDirection: input.direction,
    lastMessageAt: input.occurredAt,
    responseWindowEndsAt,
    ...(input.direction === "outbound" ? { unreadStaffCount: 0 } : {}),
    status: "open", deletionState: "active", updatedAt: new Date(),
    linkStatus: "linked",
    facebookName: input.messengerProfile?.name ?? fieldString(existingThread, "facebookName"),
    facebookAvatarUrl: input.messengerProfile?.avatarUrl ?? fieldString(existingThread, "facebookAvatarUrl"),
  };
  const threadMask = Object.keys(threadFields);
  const messageId = input.metaMessageId ?? crypto.randomUUID();
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${serviceToken}`, "content-type": "application/json" },
    body: JSON.stringify({ writes: [
      {
        update: { name: documentName("chat_threads", id, env), fields: firestoreFields(threadFields) },
        updateMask: { fieldPaths: threadMask },
        ...(input.direction === "inbound" ? { updateTransforms: [{ fieldPath: "unreadStaffCount", increment: { integerValue: "1" } }] } : {}),
      },
      {
        update: { name: documentName(`chat_threads/${id}/messages`, messageId, env), fields: firestoreFields({
    direction: input.direction, text: input.text, actorUid: input.actorUid,
    status: input.status, metaMessageId: input.metaMessageId, errorCode: input.errorCode,
    createdAt: input.occurredAt, updatedAt: new Date(),
        }) },
        currentDocument: { exists: false },
      },
    ] }),
  });
  if (response.status === 409) return false;
  if (!response.ok) throw new Error("firestore_write_failed");
  return true;
}

async function writeUnlinkedInbound(message: InboundMessage, profile: MessengerProfile, serviceToken: string, env: Env): Promise<void> {
  const id = `messenger_unlinked_${message.psid}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
  const tombstone = await readDocument("messenger_conversation_tombstones", id, serviceToken, env);
  if (["deleting", "deleted"].includes(fieldString(tombstone, "status") ?? "")) return;
  const fields = {
    channel: "messenger", parentUid: "", parentName: profile.name ?? "Facebook chưa liên kết",
    studentId: "", studentName: "Chưa chọn học sinh", classId: "", className: "",
    assignedTeacherIds: [], messengerPsid: message.psid, pageId: message.pageId,
    lastMessagePreview: message.text.slice(0, 160), lastMessageDirection: "inbound",
    lastMessageAt: new Date(message.timestamp), responseWindowEndsAt: new Date(message.timestamp + 24 * 60 * 60 * 1000),
    status: "open", linkStatus: "unlinked", deletionState: "active", updatedAt: new Date(),
    facebookName: profile.name, facebookAvatarUrl: profile.avatarUrl,
  };
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${serviceToken}`, "content-type": "application/json" },
    body: JSON.stringify({ writes: [
      {
        update: { name: documentName("chat_threads", id, env), fields: firestoreFields(fields) },
        updateMask: { fieldPaths: Object.keys(fields) },
        updateTransforms: [{ fieldPath: "unreadStaffCount", increment: { integerValue: "1" } }],
      },
      {
        update: { name: documentName(`chat_threads/${id}/messages`, message.messageId, env), fields: firestoreFields({
          direction: "inbound", text: message.text, actorUid: null, status: "received",
          metaMessageId: message.messageId, errorCode: null,
          createdAt: new Date(message.timestamp), updatedAt: new Date(),
        }) },
        currentDocument: { exists: false },
      },
    ] }),
  });
  if (!response.ok && response.status !== 409) throw new Error("firestore_write_failed");
}

export async function webhookMessageProcessed(messageId: string, serviceToken: string, env: Env): Promise<boolean> {
  return Boolean(await readDocument("messenger_webhook_events", messageId, serviceToken, env));
}

export async function markWebhookMessageProcessed(message: InboundMessage, serviceToken: string, env: Env): Promise<void> {
  await writeDocument("messenger_webhook_events", message.messageId, {
    messageId: message.messageId,
    psid: message.psid,
    pageId: message.pageId,
    processedAt: new Date(),
  }, serviceToken, env);
}

/** Ma loi Meta doc duoc: object -> JSON (giu "code":190... de client chan doan token), con lai -> chuoi. */
export function metaErrorCode(data: Record<string, unknown>, status: number): string {
  if (data.error && typeof data.error === "object") return JSON.stringify(data.error).slice(0, 200);
  return String(data.error ?? status);
}

export async function sendGraph(body: SendBody, env: Env): Promise<{ message_id?: string; recipient_id?: string }> {
  const pageAccess = await configuredPageAccess(env);
  const pageNode = encodeURIComponent(pageAccess.pageId || "me");
  const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${pageNode}/messages`;
  const request = () => fetch(url, { method: "POST", headers: { authorization: `Bearer ${pageAccess.token}`, "content-type": "application/json" }, body: JSON.stringify(buildMessengerPayload(body)) });
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
      logEvent("warn", "meta_page_access_token_rejected", { status: response.status });
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
  const deliveryMode = body.deliveryMode ?? "response";
  const template = deliveryMode === "utility" ? utilityTemplate(body) : null;
  if (deliveryMode === "utility") {
    if (env.UTILITY_MESSAGING_ENABLED !== "true") return new Response(JSON.stringify({ error: "utility_disabled" }), { status: 403, headers: corsHeaders(env, request) });
    if (!template) return new Response(JSON.stringify({ error: "utility_template_not_approved" }), { status: 400, headers: corsHeaders(env, request) });
    if (!validUtilityParameters(body)) return new Response(JSON.stringify({ error: "utility_parameters_invalid" }), { status: 400, headers: corsHeaders(env, request) });
    if (body.tag !== undefined) return new Response(JSON.stringify({ error: "invalid_message_tag" }), { status: 400, headers: corsHeaders(env, request) });
    if (profile.role === "teacher" && !template.teacherAllowed) return new Response(JSON.stringify({ error: "utility_template_not_allowed" }), { status: 403, headers: corsHeaders(env, request) });
  } else {
    if (!body.text?.trim() || body.text.length > 2000) return new Response(JSON.stringify({ error: "invalid_message" }), { status: 400, headers: corsHeaders(env, request) });
    if (body.tag !== undefined && !isMessengerTagShape(body.tag)) return new Response(JSON.stringify({ error: "invalid_message_tag" }), { status: 400, headers: corsHeaders(env, request) });
  }
  const content = deliveryMode === "utility" ? `Thông báo tiện ích: ${template?.label ?? body.templateKey}` : body.text!.trim();
  const serviceToken = await serviceAccessToken(env);
  if (deliveryMode === "utility") {
    const integrations = await readDocument("settings", "integrations", serviceToken, env);
    if (fieldString(integrations, "facebookUtilityMessagingPermission") !== "granted") {
      return new Response(JSON.stringify({ error: "utility_permission_required" }), { status: 403, headers: corsHeaders(env, request) });
    }
    const pageId = (await configuredPageAccess(env)).pageId;
    if (!body.templateKey || !template || !await utilityTemplateAllowed(body.templateKey, template, pageId, serviceToken, env)) {
      return new Response(JSON.stringify({ error: "utility_template_not_approved" }), { status: 400, headers: corsHeaders(env, request) });
    }
  }
  if (!body.studentId && body.recipientPsid) {
    if (deliveryMode === "utility") return new Response(JSON.stringify({ error: "missing_recipient" }), { status: 400, headers: corsHeaders(env, request) });
    if (profile.role !== "admin") return new Response(JSON.stringify({ error: "admin_required" }), { status: 403, headers: corsHeaders(env, request) });
    const directThreadId = `messenger_unlinked_${body.recipientPsid}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
    const directThread = await readDocument("chat_threads", directThreadId, serviceToken, env);
    if (fieldString(directThread, "messengerPsid") !== body.recipientPsid || fieldString(directThread, "linkStatus") !== "unlinked") {
      return new Response(JSON.stringify({ error: "unlinked_conversation_not_found" }), { status: 404, headers: corsHeaders(env, request) });
    }
    const id = crypto.randomUUID();
    try {
      const result = await sendGraph({ ...body, text: content }, env);
      const occurredAt = new Date();
      await writeDocument(`chat_threads/${directThreadId}/messages`, result.message_id ?? id, { direction: "outbound", text: content, actorUid: claims.sub, status: "sent", metaMessageId: result.message_id ?? null, errorCode: null, createdAt: occurredAt, updatedAt: occurredAt }, serviceToken, env);
      await updateDocumentFields("chat_threads", directThreadId, { lastMessagePreview: content.slice(0, 160), lastMessageDirection: "outbound", lastMessageAt: occurredAt, unreadStaffCount: 0, updatedAt: occurredAt }, serviceToken, env);
      return new Response(JSON.stringify({ id, status: "sent", sent: 1, total: 1 }), { headers: corsHeaders(env, request) });
    } catch (error) {
      const code = (error instanceof Error ? error.message : String(error)).slice(0, 240);
      const responseCode = publicErrorCode(error);
      const occurredAt = new Date();
      await writeDocument(`chat_threads/${directThreadId}/messages`, id, { direction: "outbound", text: content, actorUid: claims.sub, status: "failed", metaMessageId: null, errorCode: code, createdAt: occurredAt, updatedAt: occurredAt }, serviceToken, env);
      await updateDocumentFields("chat_threads", directThreadId, { lastMessagePreview: content.slice(0, 160), lastMessageDirection: "outbound", lastMessageAt: occurredAt, unreadStaffCount: 0, updatedAt: occurredAt }, serviceToken, env);
      return new Response(JSON.stringify({ id, status: "failed", sent: 0, total: 1, error: responseCode }), { status: 502, headers: corsHeaders(env, request) });
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
      const result = await sendGraph({ ...body, text: content, recipientPsid: recipient.psid }, env);
      if (context) await writeChatEvent({ context, parentUid: recipient.parentUid, direction: "outbound", text: content, status: "sent", actorUid: claims.sub, metaMessageId: result.message_id ?? null, errorCode: null, occurredAt: new Date() }, serviceToken, env);
      results.push({ id, status: "sent" });
    } catch (error) {
      const code = (error instanceof Error ? error.message : String(error)).slice(0, 240);
      if (context) await writeChatEvent({ context, parentUid: recipient.parentUid, direction: "outbound", text: content, status: "failed", actorUid: claims.sub, metaMessageId: null, errorCode: code, occurredAt: new Date() }, serviceToken, env);
      results.push({ id, status: "failed", error: publicErrorCode(error) });
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
  if (!body.psid || !body.parentUid || !body.studentId) return new Response(JSON.stringify({ error: "invalid_link_target" }), { status: 400, headers: corsHeaders(env, request) });
  const serviceToken = await serviceAccessToken(env);
  const [student, parent] = await Promise.all([
    readDocument("students", body.studentId, serviceToken, env),
    readDocument("users", body.parentUid, serviceToken, env),
  ]);
  const context = await threadContext(body.studentId, serviceToken, env);
  const related = fieldStringArray(student, "parentUids").includes(body.parentUid)
    && fieldStringArray(parent, "studentIds").includes(body.studentId)
    && fieldString(parent, "role") === "viewer"
    && fieldString(parent, "status") === "active";
  if (!related || !context) return new Response(JSON.stringify({ error: "student_parent_required" }), { status: 400, headers: corsHeaders(env, request) });
  const unlinkedId = `messenger_unlinked_${body.psid}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
  const existing = await readDocument("chat_threads", unlinkedId, serviceToken, env);
  if (fieldString(existing, "messengerPsid") !== body.psid || fieldString(existing, "linkStatus") !== "unlinked") {
    return new Response(JSON.stringify({ error: "unlinked_conversation_not_found" }), { status: 404, headers: corsHeaders(env, request) });
  }
  const pageId = fieldString(existing, "pageId") ?? "";
  const id = threadId(body.parentUid, body.studentId);
  const now = new Date();
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${serviceToken}`, "content-type": "application/json" },
    body: JSON.stringify({ writes: [
      { update: { name: documentName("messenger_connections", body.parentUid, env), fields: firestoreFields({ uid: body.parentUid, facebookPsid: body.psid, pageId, activeStudentId: body.studentId, status: "active", linkedAt: now }) }, updateMask: { fieldPaths: ["uid", "facebookPsid", "pageId", "activeStudentId", "status", "linkedAt"] } },
      { update: { name: documentName("messenger_psid_links", body.psid, env), fields: firestoreFields({ uid: body.parentUid, pageId, activeStudentId: body.studentId, status: "active", updatedAt: now }) }, updateMask: { fieldPaths: ["uid", "pageId", "activeStudentId", "status", "updatedAt"] } },
      { update: { name: documentName("chat_threads", id, env), fields: firestoreFields({
    channel: "messenger", parentUid: body.parentUid, parentName: await parentName(body.parentUid, serviceToken, env),
    studentId: context.studentId, studentName: context.studentName, classId: context.classId, className: context.className,
    assignedTeacherIds: context.assignedTeacherIds, messengerPsid: body.psid, pageId,
    facebookName: fieldString(existing, "facebookName"),
    facebookAvatarUrl: fieldString(existing, "facebookAvatarUrl"),
    lastMessagePreview: fieldString(existing, "lastMessagePreview") ?? "",
    lastMessageDirection: fieldString(existing, "lastMessageDirection") ?? "inbound",
    lastMessageAt: fieldTimestamp(existing, "lastMessageAt") ?? new Date(),
    responseWindowEndsAt: fieldTimestamp(existing, "responseWindowEndsAt"),
    unreadStaffCount: 0, status: "open", linkStatus: "linked", deletionState: "active", updatedAt: now,
  }) }, updateMask: { fieldPaths: ["channel", "parentUid", "parentName", "studentId", "studentName", "classId", "className", "assignedTeacherIds", "messengerPsid", "pageId", "facebookName", "facebookAvatarUrl", "lastMessagePreview", "lastMessageDirection", "lastMessageAt", "responseWindowEndsAt", "unreadStaffCount", "status", "linkStatus", "deletionState", "updatedAt"] } },
      { update: { name: documentName("chat_threads", unlinkedId, env), fields: firestoreFields({ status: "closed", linkStatus: "migrated", deletionState: "deleted", updatedAt: now }) }, updateMask: { fieldPaths: ["status", "linkStatus", "deletionState", "updatedAt"] } },
      auditWrite("messenger_linked", claims.sub, { parentUid: body.parentUid, studentId: body.studentId, threadId: id }, env, now),
      ...(!await readDocument("messenger_delivery_jobs", deliveryJobId("parent_student_linked", id, "1", body.parentUid), serviceToken, env) ? [deliveryJobWrite({
        eventType: "parent_student_linked", entityId: id, version: "1", parentUid: body.parentUid, studentId: body.studentId,
        templateKey: "parent_account_link_confirmation",
        parameters: { parentEmail: fieldString(parent, "email") ?? "", studentName: context.studentName },
      }, env, now)] : []),
    ] }),
  });
  if (!response.ok) throw new Error("firestore_write_failed");
  return new Response(JSON.stringify({ ok: true, threadId: id }), { headers: corsHeaders(env, request) });
}

async function handleCreateReferral(request: Request, env: Env): Promise<Response> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) return new Response(JSON.stringify({ error: "missing_bearer_token" }), { status: 401, headers: corsHeaders(env, request) });
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  const body = await request.json<{ parentUid?: string; studentId?: string }>();
  if (!body.parentUid || !/^[A-Za-z0-9_-]{1,128}$/.test(body.parentUid) || !body.studentId || !/^[A-Za-z0-9_-]{1,128}$/.test(body.studentId)) return new Response(JSON.stringify({ error: "invalid_referral_target" }), { status: 400, headers: corsHeaders(env, request) });
  const serviceToken = await serviceAccessToken(env);
  const parent = await readDocument("users", body.parentUid, serviceToken, env);
  if (fieldString(parent, "role") !== "viewer" || fieldString(parent, "status") !== "active") return new Response(JSON.stringify({ error: "parent_not_found" }), { status: 404, headers: corsHeaders(env, request) });
  const context = await threadContext(body.studentId, serviceToken, env);
  if (!referralTargetAllowed(profile, claims.sub, fieldStringArray(parent, "studentIds"), body.studentId, context)) return new Response(JSON.stringify({ error: "parent_scope_denied" }), { status: 403, headers: corsHeaders(env, request) });
  const nonce = randomNonce();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await writeDocument("messenger_link_nonces", nonce, {
    parentUid: body.parentUid,
    studentId: body.studentId,
    status: "active",
    createdBy: claims.sub,
    createdAt: new Date(),
    expiresAt,
    usedAt: null,
  }, serviceToken, env);
  return new Response(JSON.stringify({ nonce, expiresAt: expiresAt.toISOString() }), { headers: corsHeaders(env, request) });
}

async function requireAdminRequest(request: Request, env: Env): Promise<FirebaseClaims> {
  const idToken = extractBearer(request.headers.get("authorization"));
  if (!idToken) throw new Error("missing_bearer_token");
  const claims = await verifyFirebaseToken(idToken, env);
  const profile = await requireStaff(claims.sub, idToken, env);
  if (profile.role !== "admin") throw new Error("admin_required");
  return claims;
}

async function handleMetaConnectStart(request: Request, env: Env): Promise<Response> {
  const claims = await requireAdminRequest(request, env);
  const origin = safeConnectOrigin(request.headers.get("origin") ?? undefined, env);
  const state = randomNonce();
  const requested = await request.json<{ purpose?: unknown }>().catch(() => ({}));
  const purpose = requested.purpose === "utility_setup" ? "utility_setup" : "messenger";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const serviceToken = await serviceAccessToken(env);
  await writeDocument("messenger_oauth_states", state, {
    uid: claims.sub,
    origin,
    status: "pending",
    purpose,
    createdAt: new Date(),
    expiresAt,
  }, serviceToken, env);
  const callbackUrl = `${new URL(request.url).origin}/api/meta/connect/callback`;
  const authorizationUrl = new URL(`https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`);
  authorizationUrl.searchParams.set("client_id", env.META_APP_ID);
  authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", metaOAuthScopesForPurpose(purpose).join(","));
  return new Response(JSON.stringify({ state, authorizationUrl: authorizationUrl.toString(), expiresAt: expiresAt.toISOString() }), { headers: corsHeaders(env, request) });
}

function oauthResultPage(origin: string, state: string, ok: boolean, message: string): Response {
  const payload = JSON.stringify({ type: "edumatrix-meta-connect", state, ok, message }).replace(/</g, "\\u003c");
  const targetOrigin = JSON.stringify(origin);
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Kết nối Facebook</title><body style="font-family:system-ui;padding:32px;color:#172033"><h2>${ok ? "Đã xác nhận Facebook" : "Không thể kết nối"}</h2><p>${message}</p><script>window.opener?.postMessage(${payload},${targetOrigin});window.close();</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

async function handleMetaConnectCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const serviceToken = await serviceAccessToken(env);
  const stateDocument = state ? await readDocument("messenger_oauth_states", state, serviceToken, env) : null;
  const origin = safeConnectOrigin(fieldString(stateDocument, "origin"), env);
  if (fieldString(stateDocument, "status") !== "pending" || !oauthStateActive(stateDocument, undefined, new Date())) {
    if (stateDocument && state) {
      await updateDocumentFields("messenger_oauth_states", state, { status: "expired", encryptedPages: null, expiredAt: new Date() }, serviceToken, env);
    }
    return oauthResultPage(origin, state, false, "Phiên kết nối đã hết hạn. Vui lòng mở lại từ EduMatrix.");
  }
  if (!code || url.searchParams.get("error")) {
    const metaError = url.searchParams.get("error") ?? "authorization_code_missing";
    const metaErrorReason = url.searchParams.get("error_reason") ?? "";
    const error = metaOAuthErrorMessage(metaError, metaErrorReason);
    await updateDocumentFields("messenger_oauth_states", state, {
      status: "failed",
      error,
      metaError: metaError.slice(0, 120),
      metaErrorReason: metaErrorReason.slice(0, 120),
      metaErrorCode: (url.searchParams.get("error_code") ?? "").slice(0, 40),
      metaErrorDescription: (url.searchParams.get("error_description") ?? "").slice(0, 240),
    }, serviceToken, env);
    return oauthResultPage(origin, state, false, error);
  }
  try {
    const callbackUrl = `${url.origin}/api/meta/connect/callback`;
    const tokenUrl = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", env.META_APP_ID);
    tokenUrl.searchParams.set("client_secret", normalizeSecret(env.META_APP_SECRET, "META_APP_SECRET"));
    tokenUrl.searchParams.set("redirect_uri", callbackUrl);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json<{ access_token?: string; error?: unknown }>();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error("meta_oauth_exchange_failed");
    const utilityMessagingPermission = await checkMetaUtilityPermission(tokenData.access_token, env);
    const pagesUrl = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/accounts`);
    pagesUrl.searchParams.set("fields", "id,name,access_token,picture");
    pagesUrl.searchParams.set("limit", "100");
    const pagesResponse = await fetch(pagesUrl, { headers: { authorization: `Bearer ${tokenData.access_token}` } });
    const pagesData = await pagesResponse.json<{ data?: MetaManagedPage[] }>();
    const pages = (pagesData.data ?? []).filter((page) => page.id && page.name && page.access_token);
    if (!pagesResponse.ok || !pages.length) throw new Error("meta_no_managed_pages");
    await updateDocumentFields("messenger_oauth_states", state, {
      status: "ready",
      encryptedPages: await encryptPrivateValue(JSON.stringify(pages), env),
      pageSummaries: JSON.stringify(pages.map((page) => ({ id: page.id, name: page.name, pictureUrl: page.picture?.data?.url ?? null, utilityMessagingPermission }))),
      utilityMessagingPermission,
      completedAt: new Date(),
    }, serviceToken, env);
    return oauthResultPage(origin, state, true, "Quay lại EduMatrix để chọn Fanpage.");
  } catch (reason) {
    const reasonMessage = reason instanceof Error ? reason.message : "";
    const errorCode = ["meta_no_managed_pages", "meta_oauth_exchange_failed"].includes(reasonMessage) ? reasonMessage : "meta_oauth_callback_failed";
    const error = metaOAuthCompletionErrorMessage(errorCode);
    await updateDocumentFields("messenger_oauth_states", state, { status: "failed", error, diagnosticError: errorCode.slice(0, 200) }, serviceToken, env);
    logEvent("warn", "meta_oauth_callback_failed", { errorCode });
    return oauthResultPage(origin, state, false, error);
  }
}

async function metaConnectState(request: Request, env: Env): Promise<{ body: MetaConnectBody; claims: FirebaseClaims; document: unknown; serviceToken: string }> {
  const claims = await requireAdminRequest(request, env);
  const body = await request.json<MetaConnectBody>();
  if (!body.state || !/^[A-Za-z0-9_-]{22,64}$/.test(body.state)) throw new Error("meta_oauth_state_invalid");
  const serviceToken = await serviceAccessToken(env);
  const document = await readDocument("messenger_oauth_states", body.state, serviceToken, env);
  if (!document || fieldString(document, "uid") !== claims.sub) throw new Error("meta_oauth_state_invalid");
  if (!oauthStateActive(document, claims.sub, new Date())) {
    await updateDocumentFields("messenger_oauth_states", body.state, { status: "expired", encryptedPages: null, expiredAt: new Date() }, serviceToken, env);
    throw new Error("meta_oauth_state_expired");
  }
  return { body, claims, document, serviceToken };
}

async function handleMetaConnectStatus(request: Request, env: Env): Promise<Response> {
  const { document } = await metaConnectState(request, env);
  const summaries = fieldString(document, "pageSummaries");
  return new Response(JSON.stringify({
    status: fieldString(document, "status") ?? "pending",
    pages: summaries ? JSON.parse(summaries) : [],
    error: fieldString(document, "error") ?? null,
  }), { headers: corsHeaders(env, request) });
}

async function handleMetaConnectSelect(request: Request, env: Env): Promise<Response> {
  const { body, document, serviceToken } = await metaConnectState(request, env);
  if (fieldString(document, "status") !== "ready" || !body.pageId) throw new Error("meta_oauth_not_ready");
  const encryptedPages = fieldString(document, "encryptedPages");
  if (!encryptedPages) throw new Error("meta_oauth_not_ready");
  const pages = JSON.parse(await decryptPrivateValue(encryptedPages, env)) as MetaManagedPage[];
  const page = pages.find((item) => item.id === body.pageId);
  if (!page) throw new Error("meta_page_not_available");
  const now = new Date();
  const utilityPermissionValue = fieldString(document, "utilityMessagingPermission");
  const utilityMessagingPermission: MetaUtilityPermissionStatus =
    utilityPermissionValue === "granted" || utilityPermissionValue === "missing" ? utilityPermissionValue : "unknown";
  const purpose = fieldString(document, "purpose") === "utility_setup" ? "utility_setup" : "messenger";
  const webhookSubscribedFields = await subscribePageWebhooks(page, env, purpose);
  await writeDocument("messenger_private_config", "page", {
    pageId: page.id,
    pageName: page.name,
    pagePictureUrl: page.picture?.data?.url ?? null,
    encryptedPageAccessToken: await encryptPrivateValue(page.access_token, env),
    utilityMessagingPermission,
    connectedAt: now,
  }, serviceToken, env);
  await updateDocumentFields("settings", "integrations", {
    facebookPageId: page.id,
    facebookPageName: page.name,
    facebookPagePictureUrl: page.picture?.data?.url ?? null,
    facebookConnectionStatus: "connected",
    facebookUtilityMessagingPermission: utilityMessagingPermission,
    facebookWebhookSubscriptionStatus: "verified",
    facebookWebhookSubscribedFields: webhookSubscribedFields,
    facebookWebhookVerifiedAt: now,
    facebookConnectedAt: now,
    updatedAt: now,
  }, serviceToken, env);
  await updateDocumentFields("messenger_oauth_states", body.state!, { status: "used", selectedPageId: page.id, usedAt: now, encryptedPages: null }, serviceToken, env);
  dynamicPageTokenCache = { token: page.access_token, pageId: page.id, expiresAt: Date.now() + 5 * 60 * 1000 };
  return new Response(JSON.stringify({ page: { id: page.id, name: page.name, pictureUrl: page.picture?.data?.url ?? null, utilityMessagingPermission, webhookSubscriptionStatus: "verified" } }), { headers: corsHeaders(env, request) });
}

async function handleUtilitySync(request: Request, env: Env): Promise<Response> {
  const claims = await requireAdminRequest(request, env);
  const serviceToken = await serviceAccessToken(env);
  const pageAccess = await configuredPageAccess(env);
  if (!pageAccess.pageId) throw new Error("meta_page_not_available");
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${encodeURIComponent(pageAccess.pageId)}/message_templates`);
  url.searchParams.set("fields", "id,name,status,language,category,components,rejected_reason");
  url.searchParams.set("limit", "100");
  const response = await fetch(url, { headers: { authorization: `Bearer ${pageAccess.token}` } });
  const payload = await response.json<{ data?: Array<{ id?: unknown; name?: unknown; status?: unknown; language?: unknown; category?: unknown; components?: unknown; rejected_reason?: unknown }> }>();
  if (!response.ok) throw new Error("meta_utility_sync_failed");
  const now = new Date();
  const writes: Record<string, unknown>[] = [];
  for (const [key, definition] of Object.entries(UTILITY_TEMPLATES) as Array<[UtilityTemplateKey, UtilityTemplateDefinition]>) {
    const item = (payload.data ?? []).find((candidate) => candidate.name === definition.metaName && candidate.language === definition.language);
    const parameterCount = templateParameterCount(item?.components);
    writes.push({
      update: { name: documentName("messenger_template_status", key, env), fields: firestoreFields({
        pageId: pageAccess.pageId, templateId: typeof item?.id === "string" ? item.id : null,
        templateName: definition.metaName, status: typeof item?.status === "string" ? item.status.toUpperCase() : "MISSING",
        language: definition.language, category: typeof item?.category === "string" ? item.category.toUpperCase() : null,
        parameterCount, reason: typeof item?.rejected_reason === "string" ? item.rejected_reason.slice(0, 240) : null,
        source: "sync", updatedAt: now,
      }) },
    });
  }
  writes.push(auditWrite("messenger_utility_synced", claims.sub, { pageId: pageAccess.pageId, templates: writes.length }, env, now));
  const commit = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST", headers: { authorization: `Bearer ${serviceToken}`, "content-type": "application/json" }, body: JSON.stringify({ writes }),
  });
  if (!commit.ok) throw new Error("firestore_write_failed");
  return new Response(JSON.stringify({ templates: await utilityTemplateSummaries(serviceToken, env) }), { headers: corsHeaders(env, request) });
}

async function handleUtilityStatus(request: Request, env: Env): Promise<Response> {
  await requireAdminRequest(request, env);
  const serviceToken = await serviceAccessToken(env);
  return new Response(JSON.stringify({ templates: await utilityTemplateSummaries(serviceToken, env) }), { headers: corsHeaders(env, request) });
}

async function handleUtilityToggle(request: Request, env: Env): Promise<Response> {
  const claims = await requireAdminRequest(request, env);
  const body = await request.json<{ templateKey?: unknown; enabled?: unknown }>();
  if (typeof body.templateKey !== "string" || !(body.templateKey in UTILITY_TEMPLATES) || typeof body.enabled !== "boolean") throw new Error("utility_template_not_allowed");
  const templateKey = body.templateKey as UtilityTemplateKey;
  const serviceToken = await serviceAccessToken(env);
  const pageId = (await configuredPageAccess(env)).pageId;
  if (body.enabled) {
    const summaries = await utilityTemplateSummaries(serviceToken, env);
    if (!summaries.find((item) => item.key === templateKey)?.valid) throw new Error("utility_template_not_approved");
  }
  const enabled = await enabledUtilityTemplateKeys(serviceToken, env);
  const next = body.enabled ? [...new Set([...enabled, templateKey])] : enabled.filter((key) => key !== templateKey);
  const now = new Date();
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST", headers: { authorization: `Bearer ${serviceToken}`, "content-type": "application/json" }, body: JSON.stringify({ writes: [
      { update: { name: documentName("settings", "integrations", env), fields: firestoreFields({ messengerUtilityEnabledTemplates: next, messengerUtilityUpdatedAt: now }) }, updateMask: { fieldPaths: ["messengerUtilityEnabledTemplates", "messengerUtilityUpdatedAt"] } },
      auditWrite(body.enabled ? "messenger_utility_template_enabled" : "messenger_utility_template_disabled", claims.sub, { templateKey, pageId }, env, now),
    ] }),
  });
  if (!response.ok) throw new Error("firestore_write_failed");
  return new Response(JSON.stringify({ templates: await utilityTemplateSummaries(serviceToken, env) }), { headers: corsHeaders(env, request) });
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
    logEvent("warn", "webhook_signature_invalid", {
      object: diagnostic.object,
      pageIdSuffix: diagnostic.pageId?.slice(-4),
      entryKeys: diagnostic.entryKeys,
    });
    return new Response("Invalid signature", { status: 401 });
  }
  const payload = JSON.parse(raw) as unknown;
  const serviceToken = await serviceAccessToken(env);
  const referralLinks = extractReferralLinks(payload);
  const inboundMessages = extractInboundMessages(payload);
  const templateStatuses = extractUtilityTemplateStatuses(payload);
  const entries = payload && typeof payload === "object" ? (payload as { entry?: unknown[] }).entry ?? [] : [];
  logEvent("info", "webhook_received", {
    entries: entries.length,
    messagingEvents: entries.reduce<number>((count, entry) => count + (
      entry && typeof entry === "object" && Array.isArray((entry as { messaging?: unknown[] }).messaging)
        ? ((entry as { messaging: unknown[] }).messaging.length)
        : 0
    ), 0),
    referrals: referralLinks.length,
    inboundMessages: inboundMessages.length,
    templateStatuses: templateStatuses.length,
  });
  for (const status of templateStatuses) {
    const templateKey = utilityTemplateKeyByName(status.templateName);
    const id = (templateKey ?? status.templateId ?? `${status.pageId}_${status.templateName}_${status.language ?? "unknown"}`)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 180);
    await updateDocumentFields("messenger_template_status", id, {
      ...status,
      updatedAt: new Date(status.timestamp),
    }, serviceToken, env);
    if (templateKey && ["PAUSED", "REJECTED", "REVOKED"].includes(status.status.toUpperCase())) {
      const enabled = await enabledUtilityTemplateKeys(serviceToken, env);
      if (enabled.includes(templateKey)) {
        await updateDocumentFields("settings", "integrations", {
          messengerUtilityEnabledTemplates: enabled.filter((key) => key !== templateKey),
          messengerUtilityUpdatedAt: new Date(),
        }, serviceToken, env);
      }
    }
  }
  for (const link of referralLinks) {
    await claimReferralNonce(link.nonce, link.psid, link.pageId, serviceToken, env);
  }
  for (const message of inboundMessages) {
    const messengerProfile = await fetchMessengerProfile(message.psid, env);
    const link = await readDocument("messenger_psid_links", message.psid, serviceToken, env);
    const parentUid = fieldString(link, "uid");
    const studentId = fieldString(link, "activeStudentId");
    if (!parentUid || !studentId || fieldString(link, "status") !== "active") {
      await writeUnlinkedInbound(message, messengerProfile, serviceToken, env);
      await markWebhookMessageProcessed(message, serviceToken, env);
      continue;
    }
    const [user, student] = await Promise.all([
      readDocument("users", parentUid, serviceToken, env),
      readDocument("students", studentId, serviceToken, env),
    ]);
    if (!fieldStringArray(user, "studentIds").includes(studentId) || !fieldStringArray(student, "parentUids").includes(parentUid)) {
      await updateDocumentFields("messenger_psid_links", message.psid, { status: "needs_context", updatedAt: new Date() }, serviceToken, env);
      continue;
    }
    const context = await threadContext(studentId, serviceToken, env);
    if (context) {
      await writeChatEvent({ context, parentUid, direction: "inbound", text: message.text, status: "received", actorUid: null, metaMessageId: message.messageId, errorCode: null, occurredAt: new Date(message.timestamp), messengerProfile }, serviceToken, env);
      await markWebhookMessageProcessed(message, serviceToken, env);
    }
  }
  return new Response("EVENT_RECEIVED");
}

async function processConversationDeletionQueue(env: Env): Promise<void> {
  const serviceToken = await serviceAccessToken(env);
  const tombstones = await queryDocuments("messenger_conversation_tombstones", serviceToken, env, {
    fieldPath: "status",
    op: "EQUAL",
    value: "deleting",
  });
  for (const tombstone of tombstones) {
    const id = firestoreDocumentId(tombstone);
    if (!id || !validChatThreadId(id)) continue;
    try {
      const removed = await processConversationDeletion(id, tombstone, serviceToken, env);
      logEvent("info", "conversation_delete_progress", { threadId: id, removed });
    } catch (error) {
      logEvent("error", "conversation_delete_failed", { threadId: id, errorCode: publicErrorCode(error) });
    }
  }
}

async function finishDeliveryJob(id: string, actorUid: string, fields: Record<string, unknown>, token: string, env: Env): Promise<void> {
  const now = new Date();
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ writes: [
      { update: { name: documentName("messenger_delivery_jobs", id, env), fields: firestoreFields({ ...fields, updatedAt: now, leaseUntil: null }) }, updateMask: { fieldPaths: [...Object.keys(fields), "updatedAt", "leaseUntil"] } },
      auditWrite("messenger_delivery_job_updated", actorUid, { jobId: id, status: fields.status }, env, now),
    ] }),
  });
  if (!response.ok) throw new Error("firestore_write_failed");
}

async function processDeliveryJob(id: string, job: unknown, token: string, env: Env): Promise<void> {
  const updateTime = documentUpdateTime(job);
  if (!updateTime) return;
  const attempts = fieldInteger(job, "attempts") + 1;
  const now = new Date();
  const claim = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ writes: [{
      update: { name: documentName("messenger_delivery_jobs", id, env), fields: firestoreFields({ status: "processing", attempts, leaseUntil: new Date(now.getTime() + 2 * 60 * 1000), updatedAt: now }) },
      updateMask: { fieldPaths: ["status", "attempts", "leaseUntil", "updatedAt"] }, currentDocument: { updateTime },
    }] }),
  });
  if (!claim.ok) return;
  const parentUid = fieldString(job, "parentUid") ?? "";
  const studentId = fieldString(job, "studentId") ?? "";
  const templateKey = fieldString(job, "templateKey") as UtilityTemplateKey;
  const definition = UTILITY_TEMPLATES[templateKey];
  if (!parentUid || !studentId || !definition) {
    await finishDeliveryJob(id, "system", { status: "skipped", lastErrorCode: "invalid_job" }, token, env);
    return;
  }
  const connection = await readDocument("messenger_connections", parentUid, token, env);
  const psid = fieldString(connection, "facebookPsid");
  if (!psid || fieldString(connection, "status") !== "active" || fieldString(connection, "activeStudentId") !== studentId) {
    await finishDeliveryJob(id, "system", { status: "skipped", lastErrorCode: "no_connection" }, token, env);
    return;
  }
  try {
    const pageId = (await configuredPageAccess(env)).pageId;
    const settings = await readDocument("settings", "integrations", token, env);
    if (fieldString(settings, "facebookUtilityMessagingPermission") !== "granted" || !await utilityTemplateAllowed(templateKey, definition, pageId, token, env)) throw new Error("utility_template_not_approved");
    const parameters = JSON.parse(fieldString(job, "parametersJson") ?? "{}") as Record<string, string>;
    if (!validUtilityParameters({ recipientPsid: psid, deliveryMode: "utility", templateKey, parameters })) throw new Error("utility_parameters_invalid");
    const result = await sendGraph({ recipientPsid: psid, deliveryMode: "utility", templateKey, parameters }, env);
    await finishDeliveryJob(id, "system", { status: "sent", metaMessageId: result.message_id ?? null, sentAt: new Date(), lastErrorCode: null }, token, env);
  } catch (error) {
    const errorCode = publicErrorCode(error);
    await finishDeliveryJob(id, "system", {
      status: "failed", lastErrorCode: errorCode,
      nextAttemptAt: attempts < 3 ? new Date(Date.now() + attempts * 5 * 60 * 1000) : null,
    }, token, env);
  }
}

async function processDeliveryQueue(env: Env): Promise<void> {
  if (env.UTILITY_MESSAGING_ENABLED !== "true" || env.UTILITY_AUTOMATION_ENABLED !== "true") return;
  const token = await serviceAccessToken(env);
  const jobs = await queryDocuments("messenger_delivery_jobs", token, env);
  const now = Date.now();
  for (const job of jobs) {
    const id = firestoreDocumentId(job);
    if (!id || !deliveryJobEligible(job, now)) continue;
    await processDeliveryJob(id, job, token, env);
  }
}

async function handleRetryDeliveryJob(request: Request, env: Env): Promise<Response> {
  const claims = await requireAdminRequest(request, env);
  const body = await request.json<{ jobId?: unknown }>();
  if (typeof body.jobId !== "string" || !/^[A-Za-z0-9:_-]{1,500}$/.test(body.jobId)) throw new Error("invalid_delivery_job");
  const token = await serviceAccessToken(env);
  const job = await readDocument("messenger_delivery_jobs", body.jobId, token, env);
  if (!job) throw new Error("delivery_job_not_found");
  await finishDeliveryJob(body.jobId, claims.sub, { status: "pending", attempts: 0, nextAttemptAt: new Date(), lastErrorCode: null }, token, env);
  return new Response(JSON.stringify({ ok: true, jobId: body.jobId, status: "pending" }), { headers: corsHeaders(env, request) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startedAt = Date.now();
    const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
    const path = new URL(request.url).pathname;
    try {
      let response: Response;
      if (request.method === "OPTIONS") response = new Response(null, { status: 204, headers: corsHeaders(env, request) });
      else if (path === "/health" || path === "/health.release") response = new Response(JSON.stringify({
        ok: true,
        service: "messenger-worker",
        version: env.CF_VERSION_METADATA?.id ?? "local",
        release: env.RELEASE_SHA ?? (env.CF_VERSION_METADATA?.tag || "local"),
        environment: env.ALLOWED_ORIGIN.includes("localhost") ? "development" : "production",
        utilityMessagingEnabled: env.UTILITY_MESSAGING_ENABLED === "true",
        utilityAutomationEnabled: env.UTILITY_AUTOMATION_ENABLED === "true",
      }), { headers: corsHeaders(env, request) });
      else if (path === "/api/messenger/send" && request.method === "POST") response = await handleSend(request, env);
      else if (path === "/api/messenger/referral" && request.method === "POST") response = await handleCreateReferral(request, env);
      else if (path === "/api/messenger/link" && request.method === "POST") response = await handleLinkConversation(request, env);
      else if (path === "/api/messenger/sync-contexts" && request.method === "POST") response = await handleSyncConversationContexts(request, env);
      else if (path === "/api/viewer-dashboard/refresh" && request.method === "POST") response = await handleRefreshViewerDashboard(request, env);
      else if (path === "/api/messenger/conversation/delete" && request.method === "POST") response = await handleDeleteConversation(request, env);
      else if (path === "/api/meta/connect/start" && request.method === "POST") response = await handleMetaConnectStart(request, env);
      else if (path === "/api/meta/connect/callback" && request.method === "GET") response = await handleMetaConnectCallback(request, env);
      else if (path === "/api/meta/connect/status" && request.method === "POST") response = await handleMetaConnectStatus(request, env);
      else if (path === "/api/meta/connect/select" && request.method === "POST") response = await handleMetaConnectSelect(request, env);
      else if (path === "/api/meta/utility/sync" && request.method === "POST") response = await handleUtilitySync(request, env);
      else if (path === "/api/meta/utility/status" && request.method === "POST") response = await handleUtilityStatus(request, env);
      else if (path === "/api/meta/utility/toggle" && request.method === "POST") response = await handleUtilityToggle(request, env);
      else if (path === "/api/messenger/delivery-jobs/retry" && request.method === "POST") response = await handleRetryDeliveryJob(request, env);
      else if (path === "/webhook") response = await handleWebhook(request, env);
      else response = new Response("Not found", { status: 404 });
      response.headers.set("x-request-id", requestId);
      logEvent("info", "request_completed", { requestId, method: request.method, path, status: response.status, durationMs: Date.now() - startedAt });
      return response;
    } catch (error) {
      const errorCode = publicErrorCode(error);
      logEvent("error", "request_failed", { requestId, method: request.method, path, errorCode, durationMs: Date.now() - startedAt });
      return new Response(JSON.stringify({ error: errorCode, requestId }), { status: errorStatus(error), headers: { ...corsHeaders(env, request), "x-request-id": requestId } });
    }
  },
  async scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    context.waitUntil(Promise.all([processConversationDeletionQueue(env), processDeliveryQueue(env)]).then(() => undefined));
  },
};
