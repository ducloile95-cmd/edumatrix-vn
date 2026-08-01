import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { ChartGradientDefs, CHART_DEPTH_FILTER, CHART_GLOW_FILTER, CHART_GRADIENT } from "@/components/charts/ChartGradientDefs";
import { CHART_ANIMATION_DURATION, CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import type { DashboardLearningData } from "@/services/firestore/staffDashboard";

interface QualityChartsProps {
  days: 7 | 30 | 90;
  attendanceTrend: DashboardLearningData["attendanceTrend"];
  rankDistribution: DashboardLearningData["rankDistribution"];
  reducedMotion: boolean;
}

// Tach rieng khoi StaffDashboardPage va lazy-load: recharts (~450KB) chi tai khi
// tab "Chat luong hoc tap" thuc su can ve bieu do, khong chan first paint cua trang.
export default function QualityCharts({ days, attendanceTrend, rankDistribution, reducedMotion }: QualityChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartPanel title={`Chuyên cần ${days} ngày`} description="Tỉ lệ có mặt theo ngày" className="min-h-[300px]">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrend} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}>
              {ChartGradientDefs()}
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="date" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} minTickGap={22} />
              <YAxis domain={[0, 100]} unit="%" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`${value}%`, "Có mặt"]} />
              <Area type="monotone" dataKey="rate" stroke={CHART_GRADIENT.primary} strokeWidth={4} fill={CHART_GRADIENT.area} filter={CHART_GLOW_FILTER} activeDot={{ r: 6, fill: "#fff", stroke: CHART_PRIMARY, strokeWidth: 3 }} isAnimationActive={!reducedMotion} animationDuration={CHART_ANIMATION_DURATION} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>
      <ChartPanel title="Phân bố xếp hạng S/A/B/D" description="Dùng thang chung do Admin cấu hình" className="min-h-[300px]">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankDistribution} margin={{ top: 12, right: 6, left: -20, bottom: 0 }}>
              {ChartGradientDefs()}
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="rank" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`${value} học sinh`, "Số lượng"]} />
              <Bar dataKey="count" fill={CHART_GRADIENT.primarySoft} filter={CHART_DEPTH_FILTER} radius={[10, 10, 3, 3]} barSize={32} isAnimationActive={!reducedMotion} animationDuration={CHART_ANIMATION_DURATION} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>
    </div>
  );
}
