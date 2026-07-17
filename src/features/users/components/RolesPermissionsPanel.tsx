import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { ROLE_LABELS, USER_ROLES } from "@/constants/roles";
import type { UserRole } from "@/types/user";

const ROLES: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.VIEWER];
const PERMISSIONS = [
  { label: "Quản lý tài khoản và lời mời", source: "users, invites", allowed: { admin: true, teacher: false, viewer: false } },
  { label: "Quản lý cấu hình hệ thống", source: "settings", allowed: { admin: true, teacher: false, viewer: false } },
  { label: "Nhập điểm và giáo án", source: "scores, lesson_plans", allowed: { admin: true, teacher: true, viewer: false } },
  { label: "Điểm danh lớp được phân công", source: "attendance", allowed: { admin: true, teacher: true, viewer: false } },
  { label: "Xem dữ liệu học sinh được gắn", source: "ownership rules", allowed: { admin: true, teacher: true, viewer: true } },
  { label: "Đối soát học phí", source: "invoices, payments", allowed: { admin: true, teacher: true, viewer: false } },
] satisfies Array<{ label: string; source: string; allowed: Record<UserRole, boolean> }>;

export function RolesPermissionsPanel() {
  return <div className="motion-content-enter space-y-4"><div className="flex flex-col gap-3 rounded-card border border-primary-100 bg-primary-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-white text-primary-700 ring-1 ring-primary-100"><ShieldCheck size={19} /></span><div><p className="text-sm font-bold text-primary-900">Quyền được thực thi tại Firestore Rules</p><p className="mt-0.5 text-xs leading-5 text-primary-700">Giao diện chỉ diễn giải quyền. Không có custom role ghi đè Rules từ client.</p></div></div><span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700"><LockKeyhole size={14} />3 vai trò hệ thống</span></div><section className="rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]"><div className="border-b border-neutral-100 px-5 py-4"><h2 className="text-sm font-bold text-neutral-900">Vai trò và phân quyền</h2><p className="mt-1 text-xs text-neutral-500">Ma trận phạm vi đang áp dụng trong hệ thống.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-neutral-50 text-left text-xs font-bold text-neutral-500"><tr><th className="px-5 py-3">Phạm vi</th><th className="px-4 py-3">Nguồn Rules</th>{ROLES.map((role) => <th key={role} className="px-4 py-3 text-center">{ROLE_LABELS[role]}</th>)}</tr></thead><tbody>{PERMISSIONS.map((permission) => <tr key={permission.label} className="border-t border-neutral-100"><td className="px-5 py-3 font-medium text-neutral-800">{permission.label}</td><td className="px-4 py-3 font-mono text-xs text-neutral-500">{permission.source}</td>{ROLES.map((role) => <td key={role} className="px-4 py-3 text-center">{permission.allowed[role] ? <span className="inline-flex size-7 items-center justify-center rounded-full bg-success-50 text-success-700" aria-label="Có quyền"><Check size={15} /></span> : <span className="text-xs text-neutral-400">Không</span>}</td>)}</tr>)}</tbody></table></div></section></div>;
}
