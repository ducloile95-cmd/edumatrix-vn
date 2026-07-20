import type { Timestamp } from "firebase/firestore";

export interface ChatThreadDoc {
  channel: "messenger";
  parentUid: string;
  parentName: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  assignedTeacherIds: string[];
  lastMessagePreview: string;
  lastMessageDirection: "inbound" | "outbound";
  lastMessageAt: Timestamp;
  responseWindowEndsAt: Timestamp | null;
  unreadStaffCount: number;
  status: "open" | "resolved" | "blocked";
  updatedAt: Timestamp;
}

export interface ChatMessageDoc {
  direction: "inbound" | "outbound";
  text: string;
  actorUid: string | null;
  status: "received" | "queued" | "sent" | "failed";
  metaMessageId: string | null;
  errorCode: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MessageOutboxDoc {
  type: string;
  studentId: string | null;
  recipientPsid: string;
  content: string;
  status: "sent" | "failed";
  /** Tag Meta Message Tag da dung khi gui (vd ACCOUNT_UPDATE), null neu gui kieu RESPONSE thuong. */
  messageTag: string | null;
  /** Ma loi Meta khi status="failed" (Worker ghi, vd chua JSON co "code":190 khi token het han). */
  error?: string | null;
  actorUid: string;
  createdAt: Timestamp | string;
}

/** fanpage_posts/{postId} - lich su + hang cho dang bai Fanpage (A17). */
export interface FanpagePostDoc {
  message: string;
  link: string | null;
  /** URL anh cong khai, toi da 4 - CHI luu chuoi, khong tai len/luu file (khong dung Cloud Storage). */
  imageUrls: string[] | null;
  status: "sent" | "failed" | "scheduled" | "canceled";
  /** null neu dang ngay; co gia tri neu dang vao hang cho. */
  scheduledFor: Timestamp | null;
  actorUid: string;
  actorName: string;
  createdAt: Timestamp;
  sentAt: Timestamp | null;
  /** Id bai viet Graph API tra ve khi thanh cong. */
  postId: string | null;
  errorCode: string | null;
}
