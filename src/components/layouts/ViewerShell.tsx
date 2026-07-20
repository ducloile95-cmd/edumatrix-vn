import type { ReactNode } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { BottomNavigation } from "@/components/layouts/BottomNavigation";

/** Layout cho Phu huynh/Hoc sinh (Viewer) - mobile-first (A24): bottom-nav luon hien tren mobile, Sidebar tu lg tro len. */
export function ViewerShell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="pb-16 lg:pb-0">{children}</div>
      <BottomNavigation />
    </AppShell>
  );
}
