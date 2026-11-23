/**
 * Biểu đồ dùng màu phẳng theo token (không gradient, không đổ bóng SVG) để số liệu dễ đọc.
 * Giữ nguyên tên export để các biểu đồ hiện có không phải đổi chỗ gọi.
 */
export function ChartGradientDefs() {
  return null;
}

export const CHART_GRADIENT = {
  primary: "#3366F0",
  primarySoft: "#93B4FD",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#E4453A",
  info: "#0EA5E9",
  neutral: "#A6A29C",
  area: "rgba(51,102,240,.12)",
} as const;

export const CHART_DEPTH_FILTER: string | undefined = undefined;
export const CHART_GLOW_FILTER: string | undefined = undefined;
