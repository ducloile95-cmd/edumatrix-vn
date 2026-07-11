import type { ReactNode } from "react";
import { Topbar } from "@/components/layouts/Topbar";
import { BottomNavigation } from "@/components/layouts/BottomNavigation";

/** Layout cho Phu huynh/Hoc sinh (Viewer) - mobile-first (A24). */
export function ViewerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <Topbar />
      <main className="p-4">{children}</main>
      <BottomNavigation />
    </div>
  );
}
