import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNavigation } from "@/components/layouts/BottomNavigation";
import { Topbar } from "@/components/layouts/Topbar";
import { Sidebar } from "@/components/layouts/Sidebar";
import { RouteLoadingState } from "@/components/feedback/RouteLoadingState";
import { canUseViewTransition } from "@/utils/viewTransition";

/**
 * Layout cho Staff (Admin/Teacher) - desktop-first nhung responsive (A24).
 *
 * Dung o 2 che do trong giai doan chuyen doi:
 * - Layout route (khong truyen children) -> render <Outlet/>, Sidebar/Topbar KHONG remount khi doi tab.
 * - Wrapper cu (<AppShell>{...}</AppShell>) -> cac page chua migrate van chay binh thuong.
 * Khi ca 18 page da migrate, bo prop children va chi giu <Outlet/>.
 */
export function AppShell({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const routeEnterClass = canUseViewTransition() ? "" : "route-enter";
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("edumatrix-sidebar-collapsed") === "true");
  const toggleSidebar = () =>
    setCollapsed((current) => {
      localStorage.setItem("edumatrix-sidebar-collapsed", String(!current));
      return !current;
    });

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setSidebarOpen(false);
    window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  }, [pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar collapsed={collapsed} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={toggleSidebar} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main ref={mainRef} id="main-content" tabIndex={-1} className="page-view w-full flex-1 px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3 outline-none sm:px-4 md:pb-3 lg:px-5 lg:py-4">
          <Suspense fallback={<RouteLoadingState />}>
            <div key={pathname} className={routeEnterClass}>{children ?? <Outlet />}</div>
          </Suspense>
        </main>
        <BottomNavigation onMoreClick={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}
