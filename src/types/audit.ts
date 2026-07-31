export type AuditAction =
  | "invite_created"
  | "invite_revoked"
  | "user_status_changed"
  | "user_account_updated"
  | "link_request_approved"
  | "link_request_rejected"
  | "attendance_adjusted"
  | "scores_adjusted"
  | "settings_updated";
