import type { LucideIcon } from "lucide-react";
import {
  Bell, BookOpen, CalendarDays, ChartNoAxesCombined, ClipboardCheck, FileText,
  FolderKanban, Home, LayoutDashboard, LayoutGrid, Library, Megaphone,
  MessagesSquare, NotebookPen, Settings, UserCog, Users, Wallet,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import type { UserRole } from "@/types/user";

/** Mục lá (điều hướng được). `disabled` = module tương lai chưa có route (badge "sắp có"). */
export interface NavLeaf { to: string; label: string; icon: LucideIcon; disabled?: boolean }
/** Nhóm gập/mở (accordion) chứa các mục lá. */
export interface NavGroup { label: string; icon: LucideIcon; children: NavLeaf[] }
export type NavNode = NavLeaf | NavGroup;

export function isNavGroup(node: NavNode): node is NavGroup {
  return "children" in node;
}

// Nhánh dùng chung cho Admin/Teacher; Admin có thêm mục quản trị (Người dùng, Marketing).
const groupLopHoc: NavGroup = {
  label: "Quản lý lớp học", icon: FolderKanban,
  children: [
    { to: ROUTES.STAFF_STUDENTS, label: "Học sinh", icon: Users },
    { to: ROUTES.STAFF_CLASSES, label: "Lớp học", icon: BookOpen },
    { to: ROUTES.STAFF_CATALOG, label: "Môn học & Khóa học", icon: Library },
    { to: ROUTES.STAFF_SESSIONS, label: "Lịch học", icon: CalendarDays },
  ],
};

const groupChucNang: NavGroup = {
  label: "Chức năng", icon: LayoutGrid,
  children: [
    { to: ROUTES.STAFF_LESSON_PLANS, label: "Giáo án", icon: NotebookPen },
    { to: ROUTES.STAFF_ATTENDANCE, label: "Điểm danh", icon: ClipboardCheck },
    { to: ROUTES.STAFF_ASSIGNMENTS, label: "Bài tập", icon: FileText },
    { to: ROUTES.STAFF_SCORES, label: "Điểm học tập", icon: ChartNoAxesCombined },
  ],
};

// Mục "Tương tác lớp học" & "Marketing" là module tương lai (cần Cloudflare Worker + Facebook Graph API) → disabled.
const CHAT_FANPAGE: NavLeaf = { to: "#", label: "Tương tác lớp học", icon: MessagesSquare, disabled: true };
const MARKETING: NavLeaf = { to: "#", label: "Marketing", icon: Megaphone, disabled: true };
const TAI_CHINH: NavLeaf = { to: ROUTES.STAFF_INVOICES, label: "Tài chính", icon: Wallet };
const THONG_BAO: NavLeaf = { to: ROUTES.STAFF_ANNOUNCEMENTS, label: "Thông báo", icon: Bell };

const TONG_QUAN: NavLeaf = { to: ROUTES.STAFF_DASHBOARD, label: "Tổng quan", icon: LayoutDashboard };

export const NAVIGATION_BY_ROLE: Record<UserRole, NavNode[]> = {
  [USER_ROLES.ADMIN]: [
    TONG_QUAN,
    groupLopHoc,
    groupChucNang,
    { label: "Quản lý", icon: Settings, children: [TAI_CHINH, CHAT_FANPAGE, MARKETING, { to: ROUTES.STAFF_USERS, label: "Người dùng", icon: UserCog }, THONG_BAO] },
  ],
  [USER_ROLES.TEACHER]: [
    TONG_QUAN,
    groupLopHoc,
    groupChucNang,
    { label: "Quản lý", icon: Settings, children: [TAI_CHINH, CHAT_FANPAGE, THONG_BAO] },
  ],
  [USER_ROLES.VIEWER]: [
    { to: ROUTES.VIEWER_DASHBOARD, label: "Tổng quan", icon: Home },
    { to: ROUTES.VIEWER_SCHEDULE, label: "Lịch học", icon: CalendarDays },
    { to: ROUTES.VIEWER_ASSIGNMENTS, label: "Bài tập", icon: FileText },
    { to: ROUTES.VIEWER_TUITION, label: "Học phí", icon: Wallet },
    { to: ROUTES.VIEWER_ANNOUNCEMENTS, label: "Thông báo", icon: Bell },
  ],
};

// Bảng tra tiêu đề theo route (dồn từ mọi role) — dùng cho tiêu đề động trên Topbar.
const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  Object.values(NAVIGATION_BY_ROLE)
    .flat()
    .flatMap((node) => (isNavGroup(node) ? node.children : [node]))
    .filter((leaf) => !leaf.disabled && leaf.to !== "#")
    .map((leaf) => [leaf.to, leaf.label]),
);

/** Tiêu đề chức năng hiện tại theo pathname (để hiển thị trên Topbar). */
export function findPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/app/classes/")) return "Chi tiết lớp học";
  return "Edumatrix-vn";
}
