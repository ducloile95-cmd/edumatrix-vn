import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

interface DataListPanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Khoảng cách từ đáy bảng đến đáy vùng nhìn. */
  bottomGap?: number;
  /** Mức tối thiểu để bảng vẫn sử dụng được trên màn hình thấp. */
  minimumHeight?: number;
}

/**
 * Khung bảng tự dừng tại cùng một đường đáy của viewport.
 * Chiều cao được tính theo vị trí thật của từng bảng, không dùng một số px cố định.
 */
export function DataListPanel({
  children,
  className = "",
  bottomGap = 24,
  minimumHeight = 280,
  style,
  ...props
}: DataListPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!panelRef.current) return;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const top = panelRef.current.getBoundingClientRect().top;
      setHeight(Math.max(minimumHeight, Math.floor(viewportHeight - top - bottomGap)));
    };

    updateHeight();
    const frame = window.requestAnimationFrame(updateHeight);
    window.addEventListener("resize", updateHeight);
    window.visualViewport?.addEventListener("resize", updateHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("resize", updateHeight);
    };
  }, [bottomGap, minimumHeight]);

  return (
    <section
      ref={panelRef}
      className={`flex flex-col overflow-hidden ${className}`}
      style={{ ...style, height, minHeight: height, maxHeight: height }}
      {...props}
    >
      {children}
    </section>
  );
}

export const DATA_LIST_SCROLL =
  "min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable]";

/** Dùng khi cần luôn hiển thị rãnh cuộn dọc bên trong bảng. */
export const DATA_LIST_SCROLL_ALWAYS =
  "min-h-0 flex-1 overflow-x-auto overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]";

export const DATA_LIST_FOOTER =
  "shrink-0 border-t border-neutral-100 bg-white px-4 py-3 sm:px-5";
