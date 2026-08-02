import type { ReactNode } from "react";
import { canUseViewTransition } from "@/utils/viewTransition";

/** Motion boundary cho các page nằm ngoài AppShell như đăng nhập và pháp lý. */
export function PublicPageMotion({ children }: { children: ReactNode }) {
  return <div className={`page-view ${canUseViewTransition() ? "" : "route-enter"}`}>{children}</div>;
}
