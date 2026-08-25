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
  linkStatus?: "linked" | "unlinked" | "migrated";
  deletionState?: "active" | "deleting" | "deleted";
  messengerPsid?: string;
  facebookName?: string | null;
  facebookAvatarUrl?: string | null;
  tagIds?: string[];
  updatedAt: Timestamp;
}

export type ChatTagColor = "red" | "pink" | "amber" | "green" | "blue";

export interface ChatTagDoc {
  label: string;
  color: ChatTagColor;
  createdBy: string;
  createdAt: Timestamp;
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
