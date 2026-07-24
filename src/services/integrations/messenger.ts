import { ApiError, requestJson } from "@/services/api/request";
import { auth } from "@/services/firebase/authClient";

const FRIENDLY_ERRORS: Record<string, string> = {
  no_recipient: "Phụ huynh học sinh này chưa liên kết Messenger (chưa nhắn vào Fanpage qua link liên kết).",
  invalid_message_tag: "Tag không hợp lệ - chỉ dùng chữ in hoa và dấu gạch dưới, 3-64 ký tự.",
  invalid_message: "Nội dung tin nhắn không hợp lệ (trống hoặc quá 2000 ký tự).",
  missing_recipient: "Chưa xác định được tài khoản Messenger nhận tin.",
  unlinked_conversation_not_found: "Không tìm thấy hội thoại Facebook chưa liên kết để trả lời.",
  admin_required: "Chỉ Admin được trả lời tài khoản Facebook chưa liên kết học sinh.",
  student_scope_denied: "Học sinh này không thuộc lớp bạn phụ trách.",
  student_not_found: "Không tìm thấy học sinh.",
  staff_required: "Tài khoản của bạn không có quyền gửi Messenger.",
  missing_bearer_token: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  invalid_post_images: "Danh sách ảnh không hợp lệ (tối đa 4 URL, phải bắt đầu bằng http/https).",
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

export interface SendMessengerInput {
  recipientPsid?: string;
  text: string;
  type?: string;
  studentId?: string;
  tag?: string;
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
  postId?: string;
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

export async function linkMessengerConversation(psid: string, studentId: string): Promise<void> {
  await workerRequest("/api/messenger/link", { psid, studentId });
}

export async function sendMessenger(input: SendMessengerInput): Promise<SendMessengerResult> {
  try {
    const data = await workerRequest<MessengerResponse>("/api/messenger/send", input);
    return { sent: true, id: data.id, status: data.status, sentCount: data.sent, total: data.total };
  } catch (error) {
    return { sent: false, ...failure(error) };
  }
}

export interface PostPageInput { message: string; link?: string; imageUrls?: string[]; }
export type PostToPageResult =
  | { posted: true; id: string; status: "sent" | "failed"; postId?: string }
  | { posted: false; reason: MessengerFailureReason; message: string };

export async function postToPage(input: PostPageInput): Promise<PostToPageResult> {
  try {
    const data = await workerRequest<MessengerResponse>("/api/messenger/post", input);
    return { posted: true, id: data.id, status: data.status, postId: data.postId };
  } catch (error) {
    return { posted: false, ...failure(error) };
  }
}
