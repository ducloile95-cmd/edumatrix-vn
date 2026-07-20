import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Activity, BadgeCheck, CalendarClock, ChevronRight, CircleGauge, Clock3,
  Edit3, Eye, HeartPulse, MailCheck, Search, ShieldCheck, UserCheck, UserPlus,
  UsersRound,
} from "lucide-react";
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppShell } from "@/components/layouts/AppShell";
import { ChartGradientDefs, CHART_DEPTH_FILTER, CHART_GRADIENT } from "@/components/charts/ChartGradientDefs";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { ROLE_LABELS, USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RolesPermissionsPanel } from "@/features/users/components/RolesPermissionsPanel";
import { createInvite, listInvites, revokeInvite } from "@/services/firestore/invites";
import { listStudents } from "@/services/firestore/students";
import {
  listUsers, subscribeUsers, updateUserAccount,
} from "@/services/firestore/users";
import type { StudentDoc } from "@/types/academic";
import type { InviteDoc, UserDoc, UserRole, UserStatus } from "@/types/user";

type MainTab = "overview" | "staff" | "families" | "permissions";
type FamilyTab = "active" | "invited";
type UserRecord = UserDoc & { uid: string };

const MAIN_TABS: Array<{ value: MainTab; label: string }> = [
  { value: "overview", label: "Tổng quan" },
  { value: "staff", label: "Tài khoản Staff" },
  { value: "families", label: "Phụ huynh/Học sinh" },
  { value: "permissions", label: "Vai trò và phân quyền" },
];

const FIELD_CLASS = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

function accountCode(uid: string) {
  return `TK-${uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function timestampText(value: UserDoc["createdAt"] | undefined, pattern = "dd/MM/yyyy") {
  return value?.toDate ? format(value.toDate(), pattern) : "Chưa có dữ liệu";
}

function lastSeenText(user: UserRecord) {
  return timestampText(user.lastLoginAt, "dd/MM/yyyy, HH:mm");
}

function Avatar({ name, compact = false }: { name: string; compact?: boolean }) {
  return <span className={`${compact ? "size-8 text-3xs" : "size-10 text-xs"} flex shrink-0 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700 ring-1 ring-primary-100`}>{initials(name)}</span>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}{required && <span className="ml-0.5 text-danger-500">*</span>}</span>{children}</label>;
}

function Metric({ icon: Icon, value, label, detail, tone }: { icon: typeof UsersRound; value: string; label: string; detail: string; tone: "primary" | "success" | "warning" | "info" }) {
  const tones = {
    primary: "bg-primary-50 text-primary-700 ring-primary-100",
    success: "bg-success-50 text-success-700 ring-success-100",
    warning: "bg-warning-50 text-warning-700 ring-warning-100",
    info: "bg-info-50 text-info-700 ring-info-100",
  };
  return <div className="rounded-card border border-neutral-200 bg-white p-4 shadow-[var(--shadow-1)]"><div className="flex items-start justify-between gap-3"><span className={`flex size-9 items-center justify-center rounded-input ring-1 ${tones[tone]}`}><Icon size={18} /></span><span className="rounded-full bg-neutral-50 px-2.5 py-1 text-2xs font-semibold text-neutral-500">Realtime</span></div><p className="mt-4 text-2xl font-bold tabular-nums text-neutral-900">{value}</p><p className="mt-0.5 text-sm font-semibold text-neutral-800">{label}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div>;
}

function TabBar({ value, onChange }: { value: MainTab; onChange: (tab: MainTab) => void }) {
  return <Tabs label="Điều hướng module Người dùng" className="mb-4">{MAIN_TABS.map((tab) => <Tab key={tab.value} active={value === tab.value} onClick={() => onChange(tab.value)}>{tab.label}</Tab>)}</Tabs>;
}

function HealthRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${tone}`} /><span className="flex-1 text-neutral-600">{label}</span><strong className="tabular-nums text-neutral-900">{value}</strong></div>;
}

function CompactList({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-neutral-900">{title}</h2><p className="mt-1 text-xs text-neutral-500">{description}</p></div>{action}</div><ul className="mt-3 divide-y divide-neutral-100">{children}</ul></section>;
}

function Overview({ users, invites, onOpenStaff }: { users: UserRecord[]; invites: InviteDoc[]; onOpenStaff: () => void }) {
  const activeUsers = users.filter((user) => user.status === "active");
  const accepted = invites.filter((invite) => invite.status === "claimed").length;
  const eligibleInvites = invites.filter((invite) => invite.status !== "revoked").length;
  const acceptanceRate = eligibleInvites ? Math.round((accepted / eligibleInvites) * 100) : 0;
  const staleThreshold = subDays(new Date(), 30).getTime();
  const healthy = activeUsers.filter((user) => (user.lastLoginAt?.toDate().getTime() ?? 0) >= staleThreshold).length;
  const dormant = activeUsers.length - healthy;
  const disabled = users.length - activeUsers.length;
  const healthScore = users.length ? Math.round((healthy / users.length) * 100) : 0;
  const usage = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    const dateKey = format(date, "yyyy-MM-dd");
    const active = activeUsers.filter((user) => user.lastLoginAt?.toDate && format(user.lastLoginAt.toDate(), "yyyy-MM-dd") === dateKey).length;
    return { day: format(date, "dd/MM"), active, rate: activeUsers.length ? Math.round((active / activeUsers.length) * 100) : 0 };
  });
  const recentUsers = users.slice(0, 5);
  const staff = users.filter((user) => user.role !== USER_ROLES.VIEWER).slice(0, 5);
  const sevenDayThreshold = subDays(new Date(), 6).getTime();
  const sevenDayUsers = activeUsers.filter((user) => (user.lastLoginAt?.toDate().getTime() ?? 0) >= sevenDayThreshold).length;
  const sevenDayRate = activeUsers.length ? Math.round((sevenDayUsers / activeUsers.length) * 100) : 0;

  return <div className="motion-content-enter space-y-4">
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric icon={UsersRound} value={String(activeUsers.length)} label="Tài khoản hoạt động" detail={`${users.length} tài khoản trong hệ thống`} tone="primary" /><Metric icon={MailCheck} value={`${acceptanceRate}%`} label="Đã chấp nhận lời mời" detail={`${accepted} trên ${eligibleInvites} lời mời hợp lệ`} tone="success" /><Metric icon={HeartPulse} value={`${healthScore}/100`} label="Sức khỏe tài khoản" detail={`${dormant + disabled} tài khoản cần kiểm tra`} tone="info" /><Metric icon={Clock3} value={`${sevenDayRate}%`} label="Tần suất sử dụng" detail="Có hoạt động trong 7 ngày gần nhất" tone="warning" /></section>
    <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <ChartPanel title="Tần suất sử dụng tài khoản" description="Cột là số tài khoản hoạt động, đường là tỷ lệ trên tổng tài khoản active" className="min-h-[370px]"><div className="h-[285px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={usage} margin={{ top: 14, right: 8, left: -20, bottom: 0 }} aria-label="Biểu đồ tần suất sử dụng tài khoản theo ngày">{ChartGradientDefs()}<CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} strokeDasharray="3 5" /><XAxis dataKey="day" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><YAxis yAxisId="accounts" allowDecimals={false} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number, name: string) => [name === "rate" ? `${value}%` : `${value} tài khoản`, name === "rate" ? "Tỷ lệ sử dụng" : "Đang hoạt động"]} /><Bar yAxisId="accounts" dataKey="active" fill={CHART_GRADIENT.primary} filter={CHART_DEPTH_FILTER} radius={[8, 8, 2, 2]} barSize={24} /><Line yAxisId="rate" type="monotone" dataKey="rate" stroke="#16A34A" strokeWidth={3} dot={{ r: 4, fill: "#FFFFFF", stroke: "#16A34A", strokeWidth: 2 }} activeDot={{ r: 6 }} /></ComposedChart></ResponsiveContainer></div></ChartPanel>
      <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-neutral-900">Sức khỏe tài khoản</h2><p className="mt-1 text-xs text-neutral-500">Trạng thái và hoạt động trong 30 ngày</p></div><CircleGauge className="text-primary-500" size={22} /></div><div className="mt-5 flex items-center gap-5"><div className="grid size-28 place-items-center rounded-full p-2" style={{ background: `conic-gradient(#3366F0 0 ${healthScore}%, #E7E5E2 ${healthScore}% 100%)` }}><div className="grid size-full place-items-center rounded-full bg-white"><div className="text-center"><strong className="block text-2xl text-neutral-900">{healthScore}</strong><span className="text-2xs font-semibold text-neutral-500">điểm</span></div></div></div><div className="min-w-0 flex-1 space-y-3 text-sm"><HealthRow label="Hoạt động tốt" value={healthy} tone="bg-success-500" /><HealthRow label="Ít sử dụng" value={dormant} tone="bg-warning-500" /><HealthRow label="Đã khóa" value={disabled} tone="bg-danger-500" /></div></div><button type="button" onClick={onOpenStaff} className="mt-5 flex min-h-touch w-full items-center justify-between rounded-input border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"><span>Xem tài khoản cần kiểm tra</span><ChevronRight size={17} /></button></section>
    </section>
    <section className="grid gap-4 xl:grid-cols-2"><CompactList title="Tài khoản mới" description="Các tài khoản được kích hoạt gần đây">{recentUsers.map((user) => <li key={user.uid} className="flex items-center gap-3 py-3"><Avatar name={user.displayName} compact /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-800">{user.displayName}</p><p className="text-xs text-neutral-500">{ROLE_LABELS[user.role]}</p></div><span className="text-xs tabular-nums text-neutral-500">{timestampText(user.createdAt)}</span></li>)}</CompactList><CompactList title="Admin và Giáo viên" description="Tài khoản Staff trong hệ thống" action={<button type="button" onClick={onOpenStaff} className="text-xs font-bold text-primary-700 hover:text-primary-800">Xem tất cả</button>}>{staff.map((user) => <li key={user.uid} className="flex items-center gap-3 py-3"><Avatar name={user.displayName} compact /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-800">{user.displayName}</p><p className="truncate text-xs text-neutral-500">{user.email}</p></div><StatusBadge tone={user.role === USER_ROLES.ADMIN ? "info" : "neutral"}>{ROLE_LABELS[user.role]}</StatusBadge></li>)}</CompactList></section>
  </div>;
}

function TableSearch({ title, count, value, onChange, children }: { title: string; count: number; value: string; onChange: (value: string) => void; children?: ReactNode }) {
  return <div className="shrink-0 border-b border-neutral-200 p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-base font-bold text-neutral-900">{title}</h2><p className="mt-1 text-sm text-neutral-500">{count} tài khoản phù hợp bộ lọc</p>{children}</div><label className="relative block w-full lg:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><span className="sr-only">Tìm kiếm tài khoản</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Tìm tên, email hoặc mã" className={`${FIELD_CLASS} pl-10`} /></label></div></div>;
}

function StaffTable({ users, onEdit }: { users: UserRecord[]; onEdit: (user: UserRecord) => void }) {
  const [search, setSearch] = useState("");
  const staff = useMemo(() => users.filter((user) => user.role !== USER_ROLES.VIEWER && `${accountCode(user.uid)} ${user.displayName} ${user.email}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))), [users, search]);
  return <DataListPanel className="motion-content-enter rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]"><TableSearch title="Danh sách Admin và Giáo viên" count={staff.length} value={search} onChange={setSearch} /><div className={DATA_LIST_SCROLL}><table className="w-full min-w-[1120px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-neutral-50"><tr className="border-b border-neutral-200 text-left text-2xs font-bold uppercase tracking-[0.08em] text-neutral-500"><th className="px-5 py-3">Mã tài khoản</th><th className="px-4 py-3">Tên tài khoản</th><th className="px-4 py-3">Email đăng nhập</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Đăng ký lần đầu</th><th className="px-4 py-3">Bắt đầu sử dụng</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-neutral-100">{staff.map((user) => <tr key={user.uid} className="transition hover:bg-neutral-50/80"><td className="px-5 py-4 font-mono text-xs font-semibold text-primary-700">{accountCode(user.uid)}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><Avatar name={user.displayName} compact /><div><p className="font-semibold text-neutral-900">{user.displayName}</p><p className="text-xs text-neutral-500">{lastSeenText(user)}</p></div></div></td><td className="px-4 py-4 text-neutral-600">{user.email}</td><td className="px-4 py-4"><StatusBadge tone={user.role === USER_ROLES.ADMIN ? "info" : "neutral"}>{ROLE_LABELS[user.role]}</StatusBadge></td><td className="px-4 py-4"><StatusBadge tone={user.status === "active" ? "success" : "danger"}>{user.status === "active" ? "Đang hoạt động" : "Đã khóa"}</StatusBadge></td><td className="px-4 py-4 tabular-nums text-neutral-600">{timestampText(user.createdAt)}</td><td className="px-4 py-4 tabular-nums text-neutral-600">{timestampText(user.createdAt)}</td><td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" icon={<Edit3 size={15} />} onClick={() => onEdit(user)}>Chỉnh sửa</Button></td></tr>)}</tbody></table></div><div className={DATA_LIST_FOOTER}><p className="text-xs text-neutral-500">Danh sách cập nhật realtime và cuộn bên trong bảng.</p></div></DataListPanel>;
}

function FamilyTable({ users, invites, students, onView, onRevoke }: { users: UserRecord[]; invites: InviteDoc[]; students: (StudentDoc & { id: string })[]; onView: (user: UserRecord) => void; onRevoke: (email: string) => void }) {
  const [subtab, setSubtab] = useState<FamilyTab>("active");
  const [search, setSearch] = useState("");
  const families = users.filter((user) => user.role === USER_ROLES.VIEWER && `${accountCode(user.uid)} ${user.displayName} ${user.email}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const pending = invites.filter((invite) => invite.role === USER_ROLES.VIEWER && `${invite.email} ${invite.studentIds.join(" ")}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const studentById = new Map(students.map((student) => [student.id, student]));
  return <DataListPanel className="motion-content-enter rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]"><TableSearch title="Tài khoản Phụ huynh/Học sinh" count={subtab === "active" ? families.length : pending.length} value={search} onChange={setSearch}><div className="mt-3 inline-flex gap-1 rounded-input bg-neutral-100 p-1"><Subtab active={subtab === "active"} onClick={() => setSubtab("active")}>Đang hoạt động {families.length}</Subtab><Subtab active={subtab === "invited"} onClick={() => setSubtab("invited")}>Được mời {pending.length}</Subtab></div></TableSearch><div className={DATA_LIST_SCROLL}>{subtab === "active" ? <table className="w-full min-w-[900px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-neutral-50"><tr className="border-b border-neutral-200 text-left text-2xs font-bold uppercase tracking-[0.08em] text-neutral-500"><th className="px-5 py-3">Mã tài khoản</th><th className="px-4 py-3">Tên tài khoản</th><th className="px-4 py-3">Email đăng nhập</th><th className="px-4 py-3">Lần sử dụng cuối</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-neutral-100">{families.map((user) => <tr key={user.uid} className="transition hover:bg-neutral-50/80"><td className="px-5 py-4 font-mono text-xs font-semibold text-primary-700">{accountCode(user.uid)}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><Avatar name={user.displayName} compact /><div><p className="font-semibold text-neutral-900">{user.displayName}</p><p className="text-xs text-neutral-500">{user.studentIds.length} học sinh được gắn</p></div></div></td><td className="px-4 py-4 text-neutral-600">{user.email}</td><td className="px-4 py-4 tabular-nums text-neutral-600">{lastSeenText(user)}</td><td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" icon={<Eye size={15} />} onClick={() => onView(user)}>Xem thông tin</Button></td></tr>)}</tbody></table> : <table className="w-full min-w-[1000px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-neutral-50"><tr className="border-b border-neutral-200 text-left text-2xs font-bold uppercase tracking-[0.08em] text-neutral-500"><th className="px-5 py-3">Email được mời</th><th className="px-4 py-3">Học sinh liên kết</th><th className="px-4 py-3">Thời gian gửi</th><th className="px-4 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-neutral-100">{pending.map((invite) => <tr key={invite.email} className="transition hover:bg-neutral-50/80"><td className="px-5 py-4 font-semibold text-neutral-900">{invite.email}</td><td className="px-4 py-4 text-neutral-600">{invite.studentIds.map((id) => studentById.get(id)?.fullName ?? id).join(", ") || "Chưa liên kết"}</td><td className="px-4 py-4 tabular-nums text-neutral-600">{timestampText(invite.createdAt)}</td><td className="px-4 py-4"><StatusBadge tone={invite.status === "claimed" ? "success" : invite.status === "active" ? "warning" : "danger"}>{invite.status === "claimed" ? "Đã chấp nhận" : invite.status === "active" ? "Đang chờ" : "Đã thu hồi"}</StatusBadge></td><td className="px-5 py-4 text-right">{invite.status === "active" && <Button size="sm" variant="danger" onClick={() => onRevoke(invite.email)}>Thu hồi</Button>}</td></tr>)}</tbody></table>}</div><div className={DATA_LIST_FOOTER}><p className="text-xs text-neutral-500">Thanh cuộn được giữ bên trong bảng.</p></div></DataListPanel>;
}

function Subtab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-9 rounded-md px-3 text-xs font-semibold transition ${active ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>{children}</button>;
}

function InviteForm({ students, pending, onSubmit, onClose }: { students: (StudentDoc & { id: string })[]; pending: boolean; onSubmit: (input: { email: string; role: UserRole; studentIds: string[] }) => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(USER_ROLES.VIEWER);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit({ email, role, studentIds }); }} className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="space-y-4"><Field label="Email đăng nhập" required><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nguoidung@gmail.com" className={FIELD_CLASS} /></Field><Field label="Vai trò" required><select value={role} onChange={(event) => { setRole(event.target.value as UserRole); setStudentIds([]); }} className={FIELD_CLASS}><option value={USER_ROLES.VIEWER}>Phụ huynh/Học sinh</option><option value={USER_ROLES.TEACHER}>Giáo viên</option><option value={USER_ROLES.ADMIN}>Admin</option></select></Field>{role === USER_ROLES.VIEWER && <Field label="Học sinh được liên kết"><div className="max-h-52 overflow-y-auto rounded-input border border-neutral-200 bg-white p-2">{students.map((student) => <label key={student.id} className="flex min-h-touch items-center gap-3 rounded-md px-2 text-sm hover:bg-neutral-50"><input type="checkbox" checked={studentIds.includes(student.id)} onChange={() => setStudentIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} /><span><strong className="font-semibold text-neutral-800">{student.fullName}</strong><span className="ml-2 text-xs text-neutral-500">{student.studentCode}</span></span></label>)}</div><p className="mt-1.5 text-xs text-neutral-500">Có thể liên kết thêm học sinh sau khi tài khoản được kích hoạt.</p></Field>}</div><aside className="flex flex-col rounded-card border border-primary-100 bg-primary-50 p-5"><span className="flex size-10 items-center justify-center rounded-input bg-white text-primary-700 shadow-sm"><MailCheck size={20} /></span><h3 className="mt-4 text-base font-bold text-neutral-900">Kiểm tra trước khi gửi</h3><ul className="mt-3 space-y-3 text-sm text-neutral-600"><li className="flex gap-2"><BadgeCheck className="mt-0.5 shrink-0 text-success-700" size={16} />Email được chuẩn hóa trước khi lưu.</li><li className="flex gap-2"><ShieldCheck className="mt-0.5 shrink-0 text-primary-700" size={16} />Vai trò chỉ cấp từ lời mời hợp lệ.</li><li className="flex gap-2"><UserCheck className="mt-0.5 shrink-0 text-info-700" size={16} />Người dùng phải xác minh email.</li></ul><div className="mt-auto flex gap-2 pt-6"><Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Hủy</Button><Button type="submit" variant="primary" className="flex-1" disabled={pending}>{pending ? "Đang gửi..." : "Gửi lời mời"}</Button></div></aside></form>;
}

export default function UsersAdminPage() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const invitesQuery = useQuery({ queryKey: ["invites"], queryFn: listInvites });
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const [tab, setTab] = useState<MainTab>("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  useEffect(() => subscribeUsers((users) => client.setQueryData(["users"], users)), [client]);

  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; role: UserRole; studentIds: string[] }) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return createInvite(firebaseUser, input);
    },
    onSuccess: () => { client.invalidateQueries({ queryKey: ["invites"] }); setInviteOpen(false); },
  });
  const revokeMutation = useMutation({
    mutationFn: (email: string) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return revokeInvite(firebaseUser, email);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["invites"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ uid, input }: { uid: string; input: { displayName: string; role: UserRole; status: UserStatus; studentIds: string[] } }) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return updateUserAccount(firebaseUser, uid, input);
    },
    onSuccess: () => { client.invalidateQueries({ queryKey: ["users"] }); setSelectedUser(null); },
  });

  const loading = usersQuery.isLoading || invitesQuery.isLoading || studentsQuery.isLoading;
  const failed = usersQuery.isError || invitesQuery.isError || studentsQuery.isError;
  const users = usersQuery.data ?? [];
  const invites = invitesQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const studentById = new Map(students.map((student) => [student.id, student]));

  return <AppShell><PageHeader actions={<Button variant="primary" icon={<UserPlus size={17} />} onClick={() => setInviteOpen(true)}>Mời tài khoản</Button>} /><TabBar value={tab} onChange={setTab} />{loading && tab !== "permissions" && <div className="rounded-card border border-neutral-200 bg-white p-5"><LoadingSkeleton rows={7} /></div>}{failed && tab !== "permissions" && <ErrorState message="Không tải được dữ liệu module Người dùng." onRetry={() => { usersQuery.refetch(); invitesQuery.refetch(); studentsQuery.refetch(); }} />}{tab === "permissions" && <RolesPermissionsPanel />}{!loading && !failed && tab === "overview" && <Overview users={users} invites={invites} onOpenStaff={() => setTab("staff")} />}{!loading && !failed && tab === "staff" && <StaffTable users={users} onEdit={setSelectedUser} />}{!loading && !failed && tab === "families" && <FamilyTable users={users} invites={invites} students={students} onView={setSelectedUser} onRevoke={(email) => revokeMutation.mutate(email)} />}

    <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Mời tài khoản mới" description="Chọn đúng vai trò và học sinh liên kết trước khi gửi." size="lg"><InviteForm students={students} pending={inviteMutation.isPending} onSubmit={(input) => inviteMutation.mutate(input)} onClose={() => setInviteOpen(false)} />{inviteMutation.isError && <p role="alert" className="mt-3 text-sm font-semibold text-danger-700">Không thể gửi lời mời. Kiểm tra email và thử lại.</p>}</Modal>

    <Modal open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title={selectedUser?.role === USER_ROLES.VIEWER ? "Thông tin phụ huynh và học sinh" : "Chỉnh sửa tài khoản Staff"} description={selectedUser?.displayName} size="md">{selectedUser?.role === USER_ROLES.VIEWER ? <div><div className="flex items-center gap-3"><Avatar name={selectedUser.displayName} /><div><p className="font-bold text-neutral-900">{selectedUser.displayName}</p><p className="text-sm text-neutral-500">{selectedUser.email}</p></div></div><div className="mt-5 rounded-card border border-neutral-200 bg-white p-4"><h3 className="text-sm font-bold text-neutral-900">Học sinh được liên kết</h3><ul className="mt-2 divide-y divide-neutral-100">{selectedUser.studentIds.map((studentId) => { const student = studentById.get(studentId); return <li key={studentId} className="py-3"><p className="text-sm font-semibold text-neutral-800">{student?.fullName ?? studentId}</p><p className="mt-1 text-xs text-neutral-500">Mã học sinh: {student?.studentCode ?? studentId}</p><p className="mt-1 text-xs text-neutral-500">Ngày sinh: {student?.dateOfBirth || "Chưa cập nhật"}</p><p className="mt-1 text-xs text-neutral-500">Lớp đang học: {student?.currentClassIds.length ?? 0}</p></li>; })}</ul></div><div className="mt-4 grid grid-cols-2 gap-3"><InfoBox icon={<Activity size={17} />} label="Lần sử dụng cuối" value={lastSeenText(selectedUser)} /><InfoBox icon={<CalendarClock size={17} />} label="Trạng thái" value={selectedUser.status === "active" ? "Đang hoạt động" : "Đã khóa"} /></div></div> : selectedUser ? <StaffEditForm user={selectedUser} selfUid={firebaseUser?.uid} pending={updateMutation.isPending} onCancel={() => setSelectedUser(null)} onSave={(input) => updateMutation.mutate({ uid: selectedUser.uid, input })} /> : null}</Modal>
  </AppShell>;
}

function StaffEditForm({ user, selfUid, pending, onCancel, onSave }: { user: UserRecord; selfUid?: string; pending: boolean; onCancel: () => void; onSave: (input: { displayName: string; role: UserRole; status: UserStatus; studentIds: string[] }) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const isSelf = user.uid === selfUid;
  return <form onSubmit={(event) => { event.preventDefault(); onSave({ displayName, role, status, studentIds: user.studentIds }); }} className="space-y-4"><Field label="Tên tài khoản" required><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={FIELD_CLASS} /></Field><Field label="Email đăng nhập"><input value={user.email} disabled className={`${FIELD_CLASS} bg-neutral-100 text-neutral-500`} /><p className="mt-1.5 text-xs text-neutral-500">Email định danh không thay đổi tại màn hình quản trị.</p></Field><div className="grid grid-cols-2 gap-3"><Field label="Vai trò"><select value={role} onChange={(event) => setRole(event.target.value as UserRole)} disabled={isSelf} className={FIELD_CLASS}><option value={USER_ROLES.ADMIN}>Admin</option><option value={USER_ROLES.TEACHER}>Giáo viên</option></select></Field><Field label="Trạng thái"><select value={status} onChange={(event) => setStatus(event.target.value as UserStatus)} disabled={isSelf} className={FIELD_CLASS}><option value="active">Đang hoạt động</option><option value="disabled">Đã khóa</option></select></Field></div>{isSelf && <p className="rounded-input border border-warning-100 bg-warning-50 px-3 py-2 text-xs font-semibold text-warning-700">Không thể tự thay đổi vai trò hoặc khóa tài khoản của chính mình.</p>}<div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onCancel}>Hủy</Button><Button type="submit" variant="primary" disabled={pending}>{pending ? "Đang lưu..." : "Lưu thay đổi"}</Button></div></form>;
}

function InfoBox({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-input border border-neutral-200 bg-white p-3"><span className="text-primary-600">{icon}</span><p className="mt-2 text-xs text-neutral-500">{label}</p><p className="mt-0.5 text-sm font-bold text-neutral-800">{value}</p></div>;
}
