/** Bộ gradient và ánh sáng SVG dùng chung cho toàn bộ biểu đồ. */
export function ChartGradientDefs() {
  return (
    <defs>
      <linearGradient id="eduChartPrimary" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#A9C2FF" />
        <stop offset="22%" stopColor="#6F91FA" />
        <stop offset="62%" stopColor="#3366F0" />
        <stop offset="100%" stopColor="#1D39AC" />
      </linearGradient>
      <linearGradient id="eduChartPrimarySoft" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#DCE7FF" />
        <stop offset="48%" stopColor="#93B4FD" />
        <stop offset="100%" stopColor="#527BEF" />
      </linearGradient>
      <linearGradient id="eduChartSuccess" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#A7F3C2" />
        <stop offset="48%" stopColor="#22C55E" />
        <stop offset="100%" stopColor="#087A35" />
      </linearGradient>
      <linearGradient id="eduChartWarning" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE7A7" />
        <stop offset="52%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B55B06" />
      </linearGradient>
      <linearGradient id="eduChartDanger" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDB7B1" />
        <stop offset="52%" stopColor="#E4453A" />
        <stop offset="100%" stopColor="#A81E1A" />
      </linearGradient>
      <linearGradient id="eduChartInfo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#BAE6FD" />
        <stop offset="52%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>
      <linearGradient id="eduChartNeutral" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E7E5E2" />
        <stop offset="52%" stopColor="#A6A29C" />
        <stop offset="100%" stopColor="#66625D" />
      </linearGradient>
      <linearGradient id="eduChartArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#527BEF" stopOpacity=".72" />
        <stop offset="55%" stopColor="#93B4FD" stopOpacity=".3" />
        <stop offset="100%" stopColor="#DCE7FF" stopOpacity=".03" />
      </linearGradient>
      <filter id="eduChartDepth" x="-25%" y="-25%" width="160%" height="180%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#183B9B" floodOpacity=".2" />
        <feDropShadow dx="0" dy="1" stdDeviation=".8" floodColor="#FFFFFF" floodOpacity=".55" />
      </filter>
      <filter id="eduChartGlow" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3366F0" floodOpacity=".28" />
      </filter>
    </defs>
  );
}

export const CHART_GRADIENT = {
  primary: "url(#eduChartPrimary) #3366F0",
  primarySoft: "url(#eduChartPrimarySoft) #93B4FD",
  success: "url(#eduChartSuccess) #16A34A",
  warning: "url(#eduChartWarning) #F59E0B",
  danger: "url(#eduChartDanger) #E4453A",
  info: "url(#eduChartInfo) #0EA5E9",
  neutral: "url(#eduChartNeutral) #A6A29C",
  area: "url(#eduChartArea) rgba(147,180,253,.3)",
} as const;

export const CHART_DEPTH_FILTER = "url(#eduChartDepth)";
export const CHART_GLOW_FILTER = "url(#eduChartGlow)";
