import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export type StatCardTone = "primary" | "success" | "warning" | "danger" | "accent" | "info" | "neutral";

const TONE_CHIP: Record<StatCardTone, string> = {
  primary: "bg-primary-50 text-primary-500",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  accent: "bg-accent-50 text-accent-700",
  info: "bg-info-50 text-info-700",
  neutral: "bg-neutral-100 text-neutral-600",
};

interface StatCardProps {
  icon: ComponentType<LucideProps>;
  tone: StatCardTone;
  value: number | string;
  label: string;
  hint: string;
}

/** Thẻ KPI dùng chung cho hàng chỉ số đầu trang (Tổng quan, Lớp học, ...). */
export function StatCard({ icon: Icon, tone, value, label, hint }: StatCardProps) {
  return (
    <div className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-input ${TONE_CHIP[tone]}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="text-2xl font-bold tabular-nums text-neutral-900">{value}</p>
      <p className="text-sm font-semibold text-neutral-700">{label}</p>
      <p className="text-xs text-neutral-500">{hint}</p>
    </div>
  );
}
