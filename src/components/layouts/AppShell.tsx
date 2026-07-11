import { useState, type ReactNode } from "react";
import { Topbar } from "@/components/layouts/Topbar";
import { Sidebar } from "@/components/layouts/Sidebar";

/** Layout cho Staff (Admin/Teacher) - desktop-first nhung responsive (A24). */
export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
