import { auth } from "@/services/firebase/authClient";

const FRIENDLY_ERRORS: Record<string, string> = {
  no_recipient: "Phụ huynh học sinh này chưa liên kết Messenger (chưa nhắn vào Fanpage qua link liên kết).",
  invalid_message_tag: "Tag không hợp lệ - chỉ dùng chữ in hoa và dấu gạch dưới, 3-64 ký tự.",
  invalid_message: "Nội dung tin nhắn không hợp lệ (trống hoặc quá 2000 ký tự).",
  student_scope_denied: "Học sinh này không thuộc lớp bạn phụ trách.",
  student_not_found: "Không tìm thấy học sinh.",
  staff_required: "Tài khoản của bạn không có quyền gửi Messenger.",
  missing_bearer_token: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
};

/** Dich ma loi tho tu Worker/Meta Graph API sang thong bao de hieu cho Staff. */
export function friendlyMessengerError(message: string): string {
  if (FRIENDLY_ERRORS[message]) return FRIENDLY_ERRORS[message];
  if (message.startsWith("meta_")) return "Facebook từ chối gửi tin (có thể hết quyền gửi hoặc ngoài cửa sổ phản hồi 24h).";
  return message;
}

/** Loi gui Messenger - giu ma loi tho (code) ben canh thong bao than thien de UI con phan biet duoc truong hop can hanh dong them (vd no_recipient -> hien link moi lien ket). */
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

/**
 * Link moi 1 phu huynh lien ket Messenger qua referral (docs/messenger-api-setup.md
 * muc 5.2): phu huynh bam link, nhan vao Page, Worker webhook doc ref=uid va ghi
 * messenger_connections/{uid}. Null neu chua cau hinh VITE_MESSENGER_PAGE_USERNAME.
 */
export function messengerInviteLink(parentUid: string): string | null {
  const page = messengerPageUsername();
  return page ? `https://m.me/${page}?ref=${encodeURIComponent(parentUid)}` : null;
}

/** Link mo Trang Facebook chung (khong gan ref) - fallback nhan thu cong khi Worker chua cau hinh. Null neu chua cau hinh VITE_MESSENGER_PAGE_USERNAME. */
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
  | { sent: false; reason: MessengerFailureReason; message: string };

/** Gui tin Messenger qua Cloudflare Worker (Spark khong co Cloud Functions). Khong throw - tra ve Result. */
export async function sendMessenger(input: SendMessengerInput): Promise<SendMessengerResult> {
  const user = auth.currentUser;
  if (!user) return { sent: false, reason: "auth_required", message: "Chưa đăng nhập" };
  const endpoint = import.meta.env.VITE_MESSENGER_WORKER_URL;
  if (!endpoint) return { sent: false, reason: "not_configured", message: "Chưa cấu hình Worker Messenger (VITE_MESSENGER_WORKER_URL)" };

  try {
    const token = await user.getIdToken();
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/api/messenger/send`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as { id: string; status: "sent" | "failed"; sent?: number; total?: number; error?: string };
    if (!response.ok) return { sent: false, reason: "error", message: data.error ?? "MESSENGER_SEND_FAILED" };
    return { sent: true, id: data.id, status: data.status, sentCount: data.sent, total: data.total };
  } catch (err) {
    console.error("sendMessenger failed", err);
    return { sent: false, reason: "error", message: err instanceof Error ? err.message : "MESSENGER_SEND_FAILED" };
  }
}

export interface PostPageInput {
  message: string;
  link?: string;
  imageUrls?: string[];
}

export type PostToPageResult =
  | { posted: true; id: string; status: "sent" | "failed"; postId?: string }
  | { posted: false; reason: MessengerFailureReason; message: string };

/** Dang bai len Fanpage qua Cloudflare Worker (Spark khong co Cloud Functions). Khong throw - tra ve Result. */
export async function postToPage(input: PostPageInput): Promise<PostToPageResult> {
  const user = auth.currentUser;
  if (!user) return { posted: false, reason: "auth_required", message: "Chưa đăng nhập" };
  const endpoint = import.meta.env.VITE_MESSENGER_WORKER_URL;
  if (!endpoint) return { posted: false, reason: "not_configured", message: "Chưa cấu hình Worker Messenger (VITE_MESSENGER_WORKER_URL)" };

  try {
    const token = await user.getIdToken();
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/api/messenger/post`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as { id: string; status: "sent" | "failed"; postId?: string; error?: string };
    if (!response.ok) return { posted: false, reason: "error", message: data.error ?? "MESSENGER_POST_FAILED" };
    return { posted: true, id: data.id, status: data.status, postId: data.postId };
  } catch (err) {
    console.error("postToPage failed", err);
    return { posted: false, reason: "error", message: err instanceof Error ? err.message : "MESSENGER_POST_FAILED" };
  }
}
