import type { ReactNode } from "react";
import { AppShell } from "@/components/layouts/AppShell";

/** Layout cho Phu huynh/Hoc sinh (Viewer) - mobile-first (A24). */
export function ViewerShell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
