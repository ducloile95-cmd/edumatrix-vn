import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartGradientDefs, CHART_DEPTH_FILTER, CHART_GRADIENT } from "@/components/charts/ChartGradientDefs";
import { CHART_ANIMATION_DURATION, CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import type { FinanceMetrics } from "@/utils/dashboardMetrics";

interface FinanceAgingChartProps {
  aging: FinanceMetrics["aging"];
  reducedMotion: boolean;
  money: (value: number) => string;
}

// Tach rieng khoi StaffDashboardPage va lazy-load - xem QualityCharts.tsx.
export default function FinanceAgingChart({ aging, reducedMotion, money }: FinanceAgingChartProps) {
  return (
    <div className="h-52 border-t border-neutral-100 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={aging} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
          {ChartGradientDefs()}
          <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 5" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={90} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => money(value)} />
          <Bar dataKey="amount" fill={CHART_GRADIENT.primary} filter={CHART_DEPTH_FILTER} radius={[0, 10, 10, 0]} barSize={18} isAnimationActive={!reducedMotion} animationDuration={CHART_ANIMATION_DURATION} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
