import { ROLE_LABELS, USER_ROLES } from "@/constants/roles";
import type { UserRole } from "@/types/user";

interface PermissionRow {
  label: string;
  allowed: Record<UserRole, boolean>;
}

const PERMISSIONS: PermissionRow[] = [
  { label: "Xem điểm & tiến độ học tập", allowed: { admin: true, teacher: true, viewer: true } },
  { label: "Nhập điểm & giáo án", allowed: { admin: true, teacher: true, viewer: false } },
  { label: "Điểm danh lớp học", allowed: { admin: true, teacher: true, viewer: false } },
  { label: "Quản lý hóa đơn & học phí", allowed: { admin: true, teacher: false, viewer: false } },
  { label: "Quản lý tài khoản người dùng", allowed: { admin: true, teacher: false, viewer: false } },
];

const ROLE_ORDER: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.VIEWER];

/**
 * Tab "Vai trò & phân quyền" - ma tran chi de xem, khop quyen thuc te dang
 * duoc Firestore Rules thuc thi (firebase/firestore.rules). Chua ho tro tao
 * vai tro tuy chinh hay sua quyen tu giao dien - can them backend rieng.
 */
export function RolesPermissionsTab() {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-2 py-2">Quyền</th>
              {ROLE_ORDER.map((role) => (
                <th key={role} className="px-2 py-2 text-center">{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {PERMISSIONS.map((perm) => (
              <tr key={perm.label}>
                <td className="px-2 py-2 text-neutral-800">{perm.label}</td>
                {ROLE_ORDER.map((role) => (
                  <td key={role} className="px-2 py-2 text-center">
                    {perm.allowed[role] ? (
                      <span className="text-success-500" aria-label="Có quyền">✓</span>
                    ) : (
                      <span className="text-neutral-300" aria-label="Không có quyền">–</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Ma trận quyền theo 3 vai trò hệ thống, được Firestore Rules thực thi (không chỉ là giao diện). Chưa hỗ trợ tạo vai trò tùy chỉnh.
      </p>
    </div>
  );
}
