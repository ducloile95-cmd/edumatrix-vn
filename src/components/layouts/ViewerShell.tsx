import { Outlet } from "react-router-dom";
import { AppShell } from "@/components/layouts/AppShell";
import { BottomNavigation } from "@/components/layouts/BottomNavigation";

/**
 * Layout cho Phu huynh/Hoc sinh (Viewer) - mobile-first (A24): bottom-nav luon hien tren mobile, Sidebar tu lg tro len.
 * Dung lam layout route: Sidebar/Topbar/BottomNavigation chi mount 1 lan cho ca nhom route Viewer.
 */
export function ViewerShell() {
  return (
    <AppShell>
      <div className="pb-16 lg:pb-0">
        <Outlet />
      </div>
      <BottomNavigation />
    </AppShell>
  );
}
