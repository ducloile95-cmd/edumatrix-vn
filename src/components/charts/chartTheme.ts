// Gia tri attribute SVG khong doc duoc var(); mau theo theme do CSS .recharts-* trong index.css ghi de.
export const CHART_GRID_COLOR = "#EEECEA";
export const CHART_ANIMATION_DURATION = 600;
export const CHART_AXIS_TICK = { fontSize: 10, fill: "#78746D" } as const;
export const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid rgb(var(--n-200))",
  background: "rgb(var(--n-0))",
  color: "rgb(var(--n-800))",
  boxShadow: "var(--shadow-3)",
  fontSize: 12,
} as const;

// Cung nguon voi bang mau trong tailwind.config.ts - doi mot noi, dung o moi bieu do/inline-style.
export const CHART_PRIMARY = "#3366F0"; // primary-500
export const CHART_PRIMARY_SOFT = "#93B4FD"; // primary-300
export const CHART_PRIMARY_SOFTER = "#BFD3FE"; // primary-200
export const CHART_SUCCESS = "#16A34A"; // success-500
export const CHART_WARNING = "#F59E0B"; // warning-500
export const CHART_DANGER = "#E4453A"; // danger-500
export const CHART_NEUTRAL = "#A6A29C"; // neutral-400

export type ChartTone = "primary" | "success" | "warning" | "danger" | "neutral";

export const CHART_TONE_ACCENT: Record<ChartTone, string> = {
  primary: CHART_PRIMARY,
  success: CHART_SUCCESS,
  warning: CHART_WARNING,
  danger: CHART_DANGER,
  neutral: CHART_NEUTRAL,
};

export const CHART_TONE_BG: Record<ChartTone, string> = {
  primary: "rgb(var(--primary-50))",
  success: "rgb(var(--success-50))",
  warning: "rgb(var(--warning-50))",
  danger: "rgb(var(--danger-50))",
  neutral: "rgb(var(--n-100))",
};
