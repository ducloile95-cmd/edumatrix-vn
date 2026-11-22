import { ApiError, requestJson } from "@/services/api/request";
import { auth } from "@/services/firebase/authClient";

const FRIENDLY_ERRORS: Record<string, string> = {
  no_recipient: "Phụ huynh học sinh này chưa liên kết Messenger (chưa nhắn vào Fanpage qua link liên kết).",
  invalid_message_tag: "Tag không hợp lệ. Chỉ dùng loại thông báo được Meta cho phép.",
  meta_token_invalid: "Page Access Token không hợp lệ hoặc đã hết hạn. Vui lòng cập nhật token trong Worker Production.",
  meta_request_failed: "Facebook từ chối yêu cầu. Hãy kiểm tra cửa sổ phản hồi 24 giờ và chính sách Message Tag.",
  internal_error: "Worker gặp lỗi nội bộ. Vui lòng thử lại và cung cấp mã yêu cầu nếu lỗi tiếp diễn.",
  invalid_message: "Nội dung tin nhắn không hợp lệ (trống hoặc quá 2000 ký tự).",
  missing_recipient: "Chưa xác định được tài khoản Messenger nhận tin.",
  unlinked_conversation_not_found: "Không tìm thấy hội thoại Facebook chưa liên kết để trả lời.",
  invalid_thread_id: "Mã hội thoại không hợp lệ.",
  conversation_not_found: "Hội thoại không còn tồn tại hoặc đã được xóa.",
  firestore_delete_failed: "Không thể xóa toàn bộ dữ liệu hội thoại. Vui lòng thử lại.",
  admin_required: "Chỉ Admin được trả lời tài khoản Facebook chưa liên kết học sinh.",
  student_scope_denied: "Học sinh này không thuộc lớp bạn phụ trách.",
  student_not_found: "Không tìm thấy học sinh.",
  staff_required: "Tài khoản của bạn không có quyền gửi Messenger.",
  missing_bearer_token: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  utility_disabled: "Thông báo tiện ích đang tắt trong hệ thống.",
  utility_parameters_invalid: "Thông tin của mẫu thông báo chưa đầy đủ hoặc không hợp lệ.",
  utility_template_not_allowed: "Tài khoản của bạn không được phép sử dụng mẫu thông báo này.",
  utility_template_not_approved: "Mẫu thông báo chưa được Meta phê duyệt hoặc chưa được bật.",
  utility_permission_required: "Fanpage chưa cấp quyền Utility Messaging. Admin cần kết nối lại Fanpage trước khi bật tính năng.",
  delivery_job_not_retryable: "Chỉ có thể gửi lại thông báo đang thất bại hoặc đã bị bỏ qua.",
};

export function friendlyMessengerError(message: string): string {
  if (FRIENDLY_ERRORS[message]) return FRIENDLY_ERRORS[message];
  if (message.includes("\"code\":190") || message.includes("Invalid OAuth access token")) {
    return "Page Access Token không hợp lệ hoặc đã hết hạn. Admin cần cập nhật META_PAGE_ACCESS_TOKEN trên Worker production.";
  }
  if (message.includes("meta_")) return "Facebook từ chối gửi tin. Kiểm tra quyền gửi và cửa sổ phản hồi 24 giờ.";
  return message;
}

export class MessengerSendError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(friendlyMessengerError(code));
    this.code = code;
  }
}

function messengerPageUsername(): string {
  return (import.meta.env.VITE_MESSENGER_PAGE_USERNAME ?? "").trim();
}

export function isMessengerInviteConfigured(): boolean {
  return Boolean(messengerPageUsername() && (import.meta.env.VITE_MESSENGER_WORKER_URL ?? "").trim());
}

export function messengerPageUrl(): string | null {
  const page = messengerPageUsername();
  return page ? `https://www.facebook.com/${page}` : null;
}

export type UtilityTemplateKey =
  | "tuition_payment_reminder"
  | "tuition_payment_confirmation"
  | "class_schedule_adjustment"
  | "lesson_feedback_request"
  | "enrollment_confirmation"
  | "parent_account_link_confirmation";

export interface SendMessengerInput {
  recipientPsid?: string;
  text?: string;
  type?: string;
  studentId?: string;
  tag?: string;
  deliveryMode?: "response" | "utility";
  templateKey?: UtilityTemplateKey;
  parameters?: Record<string, string>;
}

export type MessengerFailureReason = "auth_required" | "not_configured" | "error";
export type SendMessengerResult =
  | { sent: true; id: string; status: "sent" | "failed"; sentCount?: number; total?: number }
  | { sent: false; reason: MessengerFailureReason; code: string; message: string };

interface MessengerResponse {
  id: string;
  status: "sent" | "failed";
  sent?: number;
  total?: number;
}

async function workerRequest<T>(path: string, input: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new MessengerSendError("auth_required");
  const endpoint = (import.meta.env.VITE_MESSENGER_WORKER_URL ?? "").trim();
  if (!endpoint) throw new MessengerSendError("not_configured");
  const token = await user.getIdToken();
  return requestJson<T>(`${endpoint.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: 20_000,
  });
}

export async function createMessengerInviteLink(parentUid: string, studentId: string): Promise<{ url: string; expiresAt: string }> {
  const page = messengerPageUsername();
  if (!page || !(import.meta.env.VITE_MESSENGER_WORKER_URL ?? "").trim()) throw new MessengerSendError("not_configured");
  const response = await workerRequest<{ nonce: string; expiresAt: string }>("/api/messenger/referral", { parentUid, studentId });
  return { url: `https://m.me/${page}?ref=${encodeURIComponent(response.nonce)}`, expiresAt: response.expiresAt };
}

function failure(error: unknown): { reason: MessengerFailureReason; code: string; message: string } {
  if (error instanceof MessengerSendError && error.code === "auth_required") return { reason: "auth_required", code: error.code, message: "Chưa đăng nhập" };
  if (error instanceof MessengerSendError && error.code === "not_configured") return { reason: "not_configured", code: error.code, message: "Chưa cấu hình Worker Messenger (VITE_MESSENGER_WORKER_URL)" };
  if (error instanceof ApiError) {
    const rawCode = error.details && typeof error.details === "object" && "error" in error.details && typeof error.details.error === "string"
      ? error.details.error
      : error.code;
    return { reason: "error", code: rawCode, message: friendlyMessengerError(rawCode) };
  }
  const code = error instanceof Error ? error.message : "MESSENGER_REQUEST_FAILED";
  return { reason: "error", code, message: code };
}

export interface MetaManagedPageSummary {
  id: string;
  name: string;
  pictureUrl: string | null;
  utilityMessagingPermission: "granted" | "missing" | "unknown";
}

export interface MetaConnectSession {
  state: string;
  authorizationUrl: string;
  expiresAt: string;
}

export interface MetaConnectStatus {
  status: "pending" | "ready" | "failed" | "expired" | "used";
  pages: MetaManagedPageSummary[];
  error: string | null;
}

export function startMetaPageConnection(purpose: "messenger" | "utility_setup" = "messenger"): Promise<MetaConnectSession> {
  return workerRequest("/api/meta/connect/start", { purpose });
}

export interface UtilityTemplateSummary {
  key: UtilityTemplateKey;
  pageId: string;
  templateId: string | null;
  templateName: string;
  status: string;
  language: string | null;
  category: string | null;
  parameterCount: number;
  expectedParameterCount: number;
  valid: boolean;
  enabled: boolean;
  reason: string | null;
  updatedAt: string | null;
}

export function getUtilityTemplateStatus(): Promise<{ templates: UtilityTemplateSummary[] }> {
  return workerRequest("/api/meta/utility/status", {});
}

export function syncUtilityTemplates(): Promise<{ templates: UtilityTemplateSummary[] }> {
  return workerRequest("/api/meta/utility/sync", {});
}

export function setUtilityTemplateEnabled(templateKey: UtilityTemplateKey, enabled: boolean): Promise<{ templates: UtilityTemplateSummary[] }> {
  return workerRequest("/api/meta/utility/toggle", { templateKey, enabled });
}

export interface UtilityDeliveryStatusItem {
  id: string;
  eventType: string;
  entityId: string;
  studentId: string;
  version: string;
  templateKey: UtilityTemplateKey | null;
  status: "pending" | "processing" | "expanded" | "sent" | "failed" | "skipped" | "unknown";
  attempts: number;
  lastErrorCode: string | null;
  updatedAt: string | null;
  sentAt: string | null;
}

export interface UtilityDeliveryStatusResponse {
  jobs: UtilityDeliveryStatusItem[];
  events: UtilityDeliveryStatusItem[];
}

export type UtilityDeliveryAggregateStatus = "pending" | "sent" | "failed" | "skipped" | "none";

const ACTIVE_DELIVERY_STATUSES = new Set(["pending", "processing"]);

/** Poll cham va chi khi con viec dang chay: moi lan poll la vai chuc luot doc Firestore qua Worker. */
export function utilityDeliveryRefetchInterval(response: UtilityDeliveryStatusResponse | undefined): number | false {
  if (!response) return 30_000;
  const active = [...response.jobs, ...response.events].some((item) => ACTIVE_DELIVERY_STATUSES.has(item.status));
  return active ? 30_000 : false;
}

export function summarizeUtilityDelivery(response: UtilityDeliveryStatusResponse | undefined, entityId: string): {
  status: UtilityDeliveryAggregateStatus;
  detail: string;
  retryableJobIds: string[];
} {
  const jobs = response?.jobs.filter((item) => item.entityId === entityId) ?? [];
  const events = response?.events.filter((item) => item.entityId === entityId) ?? [];
  const retryableJobIds = jobs
    .filter((item) => (item.status === "failed" || item.status === "skipped") && item.lastErrorCode !== "meta_delivery_outcome_unknown")
    .map((item) => item.id);
  if (jobs.some((item) => item.status === "failed")) return { status: "failed", detail: "Có thông báo gửi thất bại", retryableJobIds };
  if (jobs.some((item) => item.status === "pending" || item.status === "processing")) return { status: "pending", detail: "Worker đang xử lý", retryableJobIds };
  if (jobs.length && jobs.every((item) => item.status === "skipped")) {
    const uncertain = jobs.some((item) => item.lastErrorCode === "meta_delivery_outcome_unknown");
    return {
      status: "skipped",
      detail: uncertain ? "Chưa xác định Meta đã nhận tin; cần kiểm tra thủ công, không gửi lại tự động" : "Không có kết nối Messenger phù hợp",
      retryableJobIds,
    };
  }
  if (jobs.some((item) => item.status === "sent")) {
    const sent = jobs.filter((item) => item.status === "sent").length;
    return { status: "sent", detail: `Đã gửi ${sent}/${jobs.length} phụ huynh`, retryableJobIds };
  }
  if (events.some((item) => item.status === "failed")) return { status: "failed", detail: "Không tạo được hàng đợi gửi", retryableJobIds };
  if (events.some((item) => item.status === "skipped")) return { status: "skipped", detail: "Sự kiện không còn đủ điều kiện gửi", retryableJobIds };
  if (events.length) return { status: "pending", detail: "Đã xếp hàng chờ Worker", retryableJobIds };
  return { status: "none", detail: "Chưa có sự kiện gửi", retryableJobIds };
}

export async function getUtilityDeliveryStatus(entityIds: string[]): Promise<UtilityDeliveryStatusResponse> {
  const unique = [...new Set(entityIds)];
  const chunks = Array.from({ length: Math.ceil(unique.length / 100) }, (_, index) => unique.slice(index * 100, (index + 1) * 100));
  if (!chunks.length) return { jobs: [], events: [] };
  const responses = await Promise.all(chunks.map((ids) => workerRequest<UtilityDeliveryStatusResponse>("/api/messenger/delivery-jobs/status", { entityIds: ids })));
  return { jobs: responses.flatMap((item) => item.jobs), events: responses.flatMap((item) => item.events) };
}

export function retryUtilityDeliveryJob(jobId: string): Promise<{ ok: true; jobId: string; status: "pending" }> {
  return workerRequest("/api/messenger/delivery-jobs/retry", { jobId });
}

export function getMetaPageConnectionStatus(state: string): Promise<MetaConnectStatus> {
  return workerRequest("/api/meta/connect/status", { state });
}

export function selectMetaPage(state: string, pageId: string): Promise<{ page: MetaManagedPageSummary }> {
  return workerRequest("/api/meta/connect/select", { state, pageId });
}

export async function linkMessengerConversation(psid: string, parentUid: string, studentId: string): Promise<void> {
  await workerRequest("/api/messenger/link", { psid, parentUid, studentId });
}

export async function syncMessengerThreadContexts(): Promise<number> {
  const response = await workerRequest<{ updated: number }>("/api/messenger/sync-contexts", {});
  return response.updated;
}

export async function refreshViewerDashboard(): Promise<void> {
  await workerRequest("/api/viewer-dashboard/refresh", {});
}

export async function deleteMessengerConversation(threadId: string): Promise<"deleting"> {
  const response = await workerRequest<{ status: "deleting" }>("/api/messenger/conversation/delete", { threadId });
  return response.status;
}

export async function sendMessenger(input: SendMessengerInput): Promise<SendMessengerResult> {
  try {
    const data = await workerRequest<MessengerResponse>("/api/messenger/send", input);
    return { sent: true, id: data.id, status: data.status, sentCount: data.sent, total: data.total };
  } catch (error) {
    return { sent: false, ...failure(error) };
  }
}
