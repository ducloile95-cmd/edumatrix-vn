import type { UserRole } from "@/types/user";

/** Nguồn duy nhất cho role — không hardcode chuỗi role rải rác. */
export const USER_ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  VIEWER: "viewer",
} as const satisfies Record<string, UserRole>;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
  viewer: "Phụ huynh/Học sinh",
};

export const STAFF_ROLES: readonly UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.TEACHER];
export function isStaffRole(role: UserRole): boolean { return STAFF_ROLES.includes(role); }
