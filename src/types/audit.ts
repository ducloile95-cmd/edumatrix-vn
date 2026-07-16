import type { Timestamp } from "firebase/firestore";

export type AuditAction =
  | "invite_created"
  | "invite_revoked"
  | "user_status_changed"
  | "settings_updated";

/** audit_logs/{logId} - auto ID (A13, A26). Khong chua token/secret. */
export interface AuditLogDoc {
  action: AuditAction;
  actorUid: string;
  actorEmail: string;
  targetType: "invite" | "user" | "settings";
  targetId: string;
  meta?: Record<string, string>;
  createdAt: Timestamp;
}
