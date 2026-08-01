import { CHART_TONE_ACCENT, CHART_TONE_BG } from "@/components/charts/chartTheme";
import {
  getLearningProgress,
  type GradeLetter,
  type MetricValue,
} from "@/features/students/components/studentListMetrics";

export function ProgressCell({ progress }: { progress: ReturnType<typeof getLearningProgress> }) {
  const fillClass =
    progress.tone === "success" ? "bg-success-500" : progress.tone === "warning" ? "bg-warning-500" : "bg-danger-500";
  const textClass =
    progress.tone === "success" ? "text-success-700" : progress.tone === "warning" ? "text-warning-700" : "text-danger-700";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-2xs font-semibold text-neutral-500">Ngày bắt đầu</span>
        <span className="text-2xs font-semibold text-neutral-900">{progress.startDate}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={`motion-progress h-full rounded-full ${fillClass}`} style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`text-2xs font-semibold ${textClass}`}>{progress.percent}%</span>
        <span className="text-2xs text-neutral-500">{progress.remaining} buổi còn lại</span>
      </div>
    </div>
  );
}

export function ScoreRing({
  grade,
  label,
  total,
  value,
}: {
  grade?: GradeLetter | null;
  label: string;
  total: number;
  value: MetricValue;
}) {
  const tone = getMetricTone(value, grade);
  const textClassByTone = {
    success: "text-success-700",
    primary: "text-primary-700",
    warning: "text-warning-700",
    danger: "text-danger-700",
    neutral: "text-neutral-500",
  } as const;
  const palette = {
    accent: CHART_TONE_ACCENT[tone],
    bg: CHART_TONE_BG[tone],
    text: textClassByTone[tone],
  };

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-input border border-neutral-200 bg-white px-2 py-1.5">
      <div
        className="grid size-9 shrink-0 place-items-center rounded-full transition"
        style={{
          background: `conic-gradient(${palette.accent} ${value ?? 0}%, ${palette.bg} 0)`,
        }}
      >
        <div className="grid size-6 place-items-center rounded-full bg-white">
          <span className={`text-2xs font-bold ${palette.text}`}>{grade ?? (value === null ? "--" : value)}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xs font-semibold leading-4 text-neutral-700">{label}</p>
        <p className="truncate text-2xs leading-3 text-neutral-500">{total ? `${total} lần` : "Chưa có"}</p>
      </div>
    </div>
  );
}

function getMetricTone(value: MetricValue, grade?: GradeLetter | null): "success" | "primary" | "warning" | "danger" | "neutral" {
  if (grade === "S") return "success";
  if (grade === "A") return "primary";
  if (grade === "B") return "warning";
  if (grade === "D") return "danger";
  if (value === null) return "neutral";
  if (value >= 85) return "success";
  if (value >= 70) return "primary";
  if (value >= 50) return "warning";
  return "danger";
}
