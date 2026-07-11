import { NavLink } from "react-router-dom";
import { Home, CalendarDays, FileText, Wallet, Bell } from "lucide-react";

const NAV_ITEMS = [
  { to: "/portal/dashboard", label: "Tổng quan", icon: Home },
  { to: "/portal/schedule", label: "Lịch học", icon: CalendarDays },
  { to: "/portal/assignments", label: "Bài tập", icon: FileText },
  { to: "/portal/tuition", label: "Học phí", icon: Wallet },
  { to: "/portal/announcements", label: "Thông báo", icon: Bell },
];

/** Bottom navigation cho Viewer - mobile-first (A24). */
export function BottomNavigation() {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-neutral-200 bg-neutral-0 pb-[env(safe-area-inset-bottom)]"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive ? "text-primary-700" : "text-neutral-500"
            }`
          }
        >
          <Icon size={20} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
