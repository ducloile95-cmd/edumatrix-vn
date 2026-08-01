import { MoreHorizontal } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { prefetchRoute } from "@/app/routePrefetch";
import { MOBILE_NAVIGATION_BY_ROLE } from "@/constants/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

/** Thanh điều hướng 5 mục theo vai trò trên mobile; từ md trở lên dùng Sidebar. */
export function BottomNavigation({ onMoreClick }: { onMoreClick: () => void }) {
  const { role, isStaff } = useAuth();
  const { pathname } = useLocation();
  if (!role) return null;

  const items = MOBILE_NAVIGATION_BY_ROLE[role];
  const primaryRouteActive = items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  return (
    <nav
      aria-label="Điều hướng mobile"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(28,26,21,.06)] backdrop-blur md:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onPointerEnter={() => prefetchRoute(item.to)}
          onFocus={() => prefetchRoute(item.to)}
          viewTransition
          className={({ isActive }) =>
            `motion-control flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
              isActive ? "bg-primary-50/70 text-primary-700" : "text-neutral-500"
            }`
          }
        >
          <item.icon size={20} aria-hidden />
          <span className="max-w-full truncate">{item.label}</span>
        </NavLink>
      ))}
      {isStaff && (
        <button
          type="button"
          onClick={onMoreClick}
          aria-label="Mở thêm chức năng"
          aria-current={primaryRouteActive ? undefined : "page"}
          className={`motion-control flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
            primaryRouteActive ? "text-neutral-500" : "bg-primary-50/70 text-primary-700"
          }`}
        >
          <MoreHorizontal size={20} aria-hidden />
          <span>Khác</span>
        </button>
      )}
    </nav>
  );
}
