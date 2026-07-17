import type { ReactNode } from "react";

interface ChartPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ChartPanel({ title, description, children, className = "" }: ChartPanelProps) {
  return (
    <section className={`edumatrix-chart grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)] ${className}`}>
      <header>
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
      </header>
      <div className="mt-3 min-h-0">{children}</div>
    </section>
  );
}

export function ChartEmpty({ children, text }: { children?: ReactNode; text?: string }) {
  return <div className="grid h-full place-items-center rounded-input border border-dashed border-neutral-300 bg-white/50 px-4 text-center text-sm text-neutral-500">{children ?? text}</div>;
}
