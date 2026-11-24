import { USER_ROLES } from "@/constants/roles";
import type { UserRole } from "@/types/user";

/** Khop firestore.rules users delete: chi Admin, khong xoa chinh minh, khong xoa tai khoan Admin. */
export function canHardDeleteAccount(actorRole: UserRole | null | undefined, target: { uid: string; role: UserRole }, selfUid: string | undefined): boolean {
  return actorRole === USER_ROLES.ADMIN && target.uid !== selfUid && target.role !== USER_ROLES.ADMIN;
}
