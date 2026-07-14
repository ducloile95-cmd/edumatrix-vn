import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Topbar } from "@/components/layouts/Topbar";
import { Sidebar } from "@/components/layouts/Sidebar";
import { PageHeader } from "@/components/ui/PageHeader";
import { ROUTES } from "@/constants/routes";

const FALLBACK_PAGE_HEADERS: Record<string, { title: string; description: string }> = {
  [ROUTES.STAFF_ASSIGNMENTS]: { title: "Bài tập", description: "Giao bài, theo dõi bài nộp và phản hồi kết quả cho học sinh." },
  [ROUTES.STAFF_INVOICES]: { title: "Học phí", description: "Tạo hóa đơn, theo dõi công nợ và đối soát thanh toán." },
  [ROUTES.STAFF_SCORES]: { title: "Điểm học tập", description: "Nhập điểm theo lớp, lưu nhận xét và theo dõi tiến bộ." },
};

/** Layout cho Staff (Admin/Teacher) - desktop-first nhung responsive (A24). */
export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("edumatrix-sidebar-collapsed") === "true");
  const { pathname } = useLocation();
  const toggleSidebar = () => setCollapsed((current) => {
    localStorage.setItem("edumatrix-sidebar-collapsed", String(!current));
    return !current;
  });

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar collapsed={collapsed} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={toggleSidebar} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        {/* key theo route → animation chuyển cảnh replay mỗi lần đổi chức năng. Full-width để bảng/dữ liệu dùng hết chiều ngang. */}
        <main key={pathname} id="main-content" className="page-enter w-full flex-1 px-3 py-5 sm:px-4 lg:px-5 lg:py-7">{FALLBACK_PAGE_HEADERS[pathname] && <PageHeader {...FALLBACK_PAGE_HEADERS[pathname]} />}{children}</main>
      </div>
    </div>
  );
}
