import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "teacher" | "viewer";
export type UserStatus = "active" | "disabled";

/** users/{uid} - xem Section 7.3 va A12. */
export interface UserDoc {
  email: string;
  displayName: string;
  address?: string;
  phone?: string;
  facebookUrl?: string;
  photoURL: string | null;
  role: UserRole;
  studentIds: string[];
  status: UserStatus;
  /** Cập nhật tự động ở AuthContext mỗi khi đăng nhập - dùng để hiển thị ở trang Người dùng. */
  lastLoginAt?: Timestamp;
  /** Tuỳ chọn thông báo cá nhân - tự set (Settings > Thông báo), key tự do theo module. */
  notificationPrefs?: Record<string, boolean>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InviteStatus = "active" | "claimed" | "revoked";

/** invites/{normalizedEmail} - xem Section 7.2. */
export interface InviteDoc {
  email: string;
  role: UserRole;
  studentIds: string[];
  status: InviteStatus;
  createdBy: string;
  createdAt: Timestamp;
  claimedAt?: Timestamp;
}

export type LinkRequestStatus = "pending" | "approved" | "rejected";

/** Mot con do phu huynh tu khai - chua phai ho so hoc sinh that. */
export interface DeclaredChildInput {
  fullName: string;
  nickname?: string;
  /** "YYYY-MM-DD". */
  dateOfBirth: string;
  /** Vi du "dang hoc lop co Lan" - giup Admin doi chieu khi trung ten. */
  note?: string;
}

/**
 * link_requests/{parentUid} - duong vao thu hai ben canh invites/.
 * Doc id = uid nen moi Gmail chi co dung mot yeu cau.
 */
export interface LinkRequestDoc {
  email: string;
  parentName: string;
  phone: string;
  address?: string;
  facebookUrl?: string;
  relationship: string;
  children: DeclaredChildInput[];
  status: LinkRequestStatus;
  rejectReason?: string;
  reviewedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
