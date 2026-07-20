import { NavLink } from "react-router-dom";
import { isNavGroup, NAVIGATION_BY_ROLE, type NavLeaf } from "@/constants/navigation";
import { USER_ROLES } from "@/constants/roles";

const items = NAVIGATION_BY_ROLE[USER_ROLES.VIEWER].filter((node): node is NavLeaf => !isNavGroup(node));

/** Thanh điều hướng dưới màn hình cho Phụ huynh/Học sinh trên mobile (A24); từ lg trở lên dùng Sidebar. */
export function BottomNavigation() {
  return (
    <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${isActive ? "text-primary-700" : "text-neutral-500"}`
          }
        >
          <item.icon size={20} aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
