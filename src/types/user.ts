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
}
