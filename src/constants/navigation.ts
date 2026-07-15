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
    { to: ROUTES.STAFF_SESSIONS, label: "Lịch học", icon: CalendarDays },
    { to: ROUTES.STAFF_CATALOG, label: "Môn học & Khóa học", icon: Library },
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

const PAGE_DESCRIPTIONS: Record<string, string> = {
  [ROUTES.STAFF_DASHBOARD]: "Những việc cần chú ý hôm nay, lịch lớp sắp tới và tiến độ học tập.",
  [ROUTES.STAFF_STUDENTS]: "Theo dõi hồ sơ học sinh, lớp đang học, tiến độ, điểm danh, bài tập và đánh giá.",
  [ROUTES.STAFF_CLASSES]: "Tạo lớp, gắn khóa học, môn học, giáo viên và quản lý danh sách học sinh.",
  [ROUTES.STAFF_CATALOG]: "Quản lý môn học và khóa học dùng để tạo lớp, học phí và lộ trình học.",
  [ROUTES.STAFF_SESSIONS]: "Xem lịch dạy theo Ngày, Tuần, Tháng và cập nhật lịch học.",
  [ROUTES.STAFF_LESSON_PLANS]: "Soạn giáo án theo phần, lưu nháp, gắn lớp và xuất bản tóm tắt công khai.",
  [ROUTES.STAFF_ATTENDANCE]: "Tải danh sách lớp, điểm danh nhanh và lưu cả lớp trong một lần.",
  [ROUTES.STAFF_ASSIGNMENTS]: "Giao bài, theo dõi bài nộp và phản hồi kết quả cho học sinh.",
  [ROUTES.STAFF_SCORES]: "Nhập điểm theo lớp, lưu nhận xét và theo dõi tiến bộ học tập.",
  [ROUTES.STAFF_INVOICES]: "Tạo hóa đơn, theo dõi công nợ và đối soát thanh toán.",
  [ROUTES.STAFF_USERS]: "Mời tài khoản mới, theo dõi lời mời và khóa hoặc mở tài khoản.",
  [ROUTES.STAFF_ANNOUNCEMENTS]: "Đăng thông báo lên Fanpage và nhắn phụ huynh qua Messenger.",
  [ROUTES.VIEWER_DASHBOARD]: "Lịch học, bài tập, điểm số và học phí cần theo dõi.",
  [ROUTES.VIEWER_SCHEDULE]: "Các buổi học sắp tới của học sinh.",
  [ROUTES.VIEWER_ASSIGNMENTS]: "Theo dõi bài cần nộp và gửi bài làm cho giáo viên.",
  [ROUTES.VIEWER_TUITION]: "Theo dõi khoản cần thanh toán và xác nhận chuyển khoản.",
  [ROUTES.VIEWER_ANNOUNCEMENTS]: "Thông tin mới nhất từ giáo viên và nhà trường.",
};

/** Tiêu đề chức năng hiện tại theo pathname (để hiển thị trên Topbar). */
export function findPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/app/classes/")) return "Chi tiết lớp học";
  return "Edumatrix-vn";
}

export function findPageDescription(pathname: string): string {
  if (PAGE_DESCRIPTIONS[pathname]) return PAGE_DESCRIPTIONS[pathname];
  if (pathname.startsWith("/app/classes/")) return "Quản lý học sinh, ghi danh và dữ liệu học tập của lớp.";
  return "Edumatrix-vn · Quản lý lớp học thông minh";
}
