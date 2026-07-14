import type { ReactNode } from "react";

const APP_DESCRIPTION = "Edumatrix-vn · Quản lý lớp học thông minh";

interface PageHeaderProps {
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ description, eyebrow, actions }: PageHeaderProps) {
  if (!description && !eyebrow && !actions) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-xs font-semibold text-primary-700">{eyebrow}</p>}
        <p className="max-w-[70ch] text-sm leading-6 text-neutral-500">{description ?? APP_DESCRIPTION}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
