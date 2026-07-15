import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Topbar } from "@/components/layouts/Topbar";
import { Sidebar } from "@/components/layouts/Sidebar";

/** Layout cho Staff (Admin/Teacher) - desktop-first nhung responsive (A24). */
export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("edumatrix-sidebar-collapsed") === "true");
  const { pathname } = useLocation();
  const toggleSidebar = () =>
    setCollapsed((current) => {
      localStorage.setItem("edumatrix-sidebar-collapsed", String(!current));
      return !current;
    });

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar collapsed={collapsed} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={toggleSidebar} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main key={pathname} id="main-content" className="page-enter w-full flex-1 px-3 py-3 sm:px-4 lg:px-5 lg:py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
