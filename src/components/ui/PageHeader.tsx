import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
}

/**
 * Page titles live in Topbar. This component is the compact per-page action slot.
 */
export function PageHeader({ actions }: PageHeaderProps) {
  if (!actions) return null;

  return <div className="mb-3 flex justify-end">{actions}</div>;
}
