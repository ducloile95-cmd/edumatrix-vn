import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-neutral-300 bg-neutral-0 p-8 text-center">
      <p className="font-semibold text-neutral-800">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
      {action}
    </div>
  );
}
