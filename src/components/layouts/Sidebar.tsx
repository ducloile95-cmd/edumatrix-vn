import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Wallet,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/app/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/app/students", label: "Học sinh", icon: Users },
  { to: "/app/classes", label: "Lớp học", icon: BookOpen },
  { to: "/app/sessions", label: "Lịch học", icon: CalendarDays },
  { to: "/app/attendance", label: "Điểm danh", icon: ClipboardCheck },
  { to: "/app/assignments", label: "Bài tập", icon: FileText },
  { to: "/app/invoices", label: "Học phí", icon: Wallet },
  { to: "/app/announcements", label: "Thông báo", icon: Bell },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <button
          aria-label="Đóng menu"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-neutral-900/40 lg:hidden"
        />
      )}
      <nav
        aria-label="Điều hướng chính"
        className={`fixed inset-y-0 left-0 z-30 w-64 -translate-x-full border-r border-neutral-200 bg-neutral-0 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <ul className="space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-touch items-center gap-3 rounded-input px-3 text-sm font-medium ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
