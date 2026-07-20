import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Tabs({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`flex gap-1 overflow-x-auto border-b border-neutral-200 ${className}`} role="tablist" aria-label={label}>{children}</div>;
}

export function Tab({ active, children, className = "", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { active: boolean; children: ReactNode }) {
  return (
    <button {...props} type="button" role="tab" aria-selected={active} className={`relative flex min-h-touch shrink-0 items-center gap-2 px-3 text-sm font-semibold transition ${active ? "text-primary-700" : "text-neutral-500 hover:text-neutral-800"} ${className}`}>
      {children}
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary-500" />}
    </button>
  );
}
