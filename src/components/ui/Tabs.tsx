import { useCallback, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";

export function Tabs({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const updateIndicator = useCallback(() => {
    const active = listRef.current?.querySelector<HTMLElement>("[role='tab'][aria-selected='true']");
    if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, []);

  useLayoutEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [children, updateIndicator]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='tab']:not(:disabled)")];
    if (!tabs.length) return;
    const current = Math.max(0, tabs.indexOf(document.activeElement as HTMLButtonElement));
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };

  return <div ref={listRef} className={`relative flex gap-1 overflow-x-auto border-b border-neutral-200 ${className}`} role="tablist" aria-label={label} onKeyDown={handleKeyDown}>{children}<span aria-hidden="true" className="motion-tab-indicator pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left rounded-full bg-primary-500" style={{ opacity: indicator.width ? 1 : 0, transform: `translate3d(${indicator.left}px, 0, 0) scaleX(${indicator.width})` }} /></div>;
}

export function Tab({ active, children, className = "", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { active: boolean; children: ReactNode }) {
  return (
    <button {...props} type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1} className={`motion-control relative flex min-h-touch shrink-0 items-center gap-2 px-3 text-sm font-semibold ${active ? "text-primary-700" : "text-neutral-500 hover:text-neutral-800"} ${className}`}>
      {children}
    </button>
  );
}
