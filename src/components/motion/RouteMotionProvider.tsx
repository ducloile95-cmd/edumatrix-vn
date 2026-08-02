import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { canUseViewTransition, runViewTransition } from "@/utils/viewTransition";

/** Kích hoạt View Transition cho mọi liên kết nội bộ, không phụ thuộc page hay role. */
export function RouteMotionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!canUseViewTransition() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target && anchor.target !== "_self" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      runViewTransition(() => navigate(`${url.pathname}${url.search}${url.hash}`));
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [navigate]);

  return children;
}
