import type { ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

/**
 * Page title and description live in Topbar. This component remains as a compact
 * per-page action slot so legacy pages can keep using their existing API.
 */
export function PageHeader({ actions }: PageHeaderProps) {
  if (!actions) return null;

  return <div className="mb-3 flex justify-end">{actions}</div>;
}
