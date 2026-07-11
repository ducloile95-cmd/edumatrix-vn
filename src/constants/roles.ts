import type { UserRole } from "@/types/user";

/** Nguon duy nhat cho role - khong hardcode chuoi role rai rac (A4.5). */
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

export const STAFF_ROLES: readonly UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.TEACHER,
];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}
