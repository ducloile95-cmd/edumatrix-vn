import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCheck, ClipboardList, RotateCcw } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { StatCard } from "@/components/ui/StatCard";
import { ChartEmpty, ChartPanel } from "@/components/charts/ChartPanel";
import {
  CHART_AXIS_TICK,
  CHART_DANGER,
  CHART_GRID_COLOR,
  CHART_PRIMARY,
  CHART_PRIMARY_SOFT,
  CHART_PRIMARY_SOFTER,
  CHART_TOOLTIP_STYLE,
} from "@/components/charts/chartTheme";
import { listAssignments, listAssignmentSummaries } from "@/services/firestore/assignments";
import { listClasses } from "@/services/firestore/classes";
import { listScoresByClass } from "@/services/firestore/scores";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const FUNNEL_KEYS = [
  { key: "assigned" as const, label: "Được giao", color: CHART_PRIMARY_SOFTER },
  { key: "submitted" as const, label: "Đã nộp", color: CHART_PRIMARY_SOFT },
  { key: "graded" as const, label: "Đã chấm", color: CHART_PRIMARY },
  { key: "redo" as const, label: "Làm lại", color: CHART_DANGER },
];

const SCORE_BUCKETS = [
  { label: "<50%", min: 0, max: 50 },
  { label: "50-65%", min: 50, max: 65 },
  { label: "65-80%", min: 65, max: 80 },
  { label: "80-90%", min: 80, max: 90 },
  { label: "90-100%", min: 90, max: 101 },
];

export function LearningOverview({ onOpenAssignments }: { onOpenAssignments: () => void }) {
  const reducedMotion = useReducedMotion();
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: listAssignments });
  const summaries = useQuery({ queryKey: ["assignment-summaries"], queryFn: listAssignmentSummaries });
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const classIds = (classes.data ?? []).map((item) => item.id);
  const scores = useQuery({
    queryKey: ["learning-overview-scores", classIds],
    queryFn: async () => (await Promise.all(classIds.map((classId) => listScoresByClass(classId)))).flat(),
    enabled: classIds.length > 0,
    staleTime: 60_000,
  });

  const totals = useMemo(() => (summaries.data ?? []).reduce((value, item) => ({
    assigned: value.assigned + item.totalStudents,
    submitted: value.submitted + item.submittedCount,
    graded: value.graded + item.gradedCount,
    redo: value.redo + item.redoCount,
  }), { assigned: 0, submitted: 0, graded: 0, redo: 0 }), [summaries.data]);

  const overview = {
    ...totals,
    waiting: Math.max(0, totals.submitted - totals.graded - totals.redo),
    submittedPercent: totals.assigned ? Math.round(totals.submitted / totals.assigned * 100) : 0,
  };

  const analytics = useMemo(() => {
    const classNames = new Map((classes.data ?? []).map((item) => [item.id, item.name]));
    const summaryByAssignment = new Map((summaries.data ?? []).map((item) => [item.assignmentId, item]));
    const byClass = new Map<string, { submitted: number; total: number }>();

    (assignments.data ?? []).forEach((assignment) => {
      const summary = summaryByAssignment.get(assignment.id);
      if (!summary) return;
      const bucket = byClass.get(assignment.classId) ?? { submitted: 0, total: 0 };
      bucket.submitted += summary.submittedCount;
      bucket.total += summary.totalStudents;
      byClass.set(assignment.classId, bucket);
    });

    const submissionByClass = [...byClass].map(([classId, value]) => ({
      name: classNames.get(classId) ?? classId,
      percent: value.total ? Math.round(value.submitted / value.total * 100) : 0,
    })).sort((a, b) => b.percent - a.percent).slice(0, 8);

    const distribution = SCORE_BUCKETS.map((bucket) => ({ ...bucket, count: 0 }));
    const assessmentMap = new Map<string, { total: number; count: number }>();
    (scores.data ?? []).forEach((score) => {
      const percent = score.maxScore > 0 ? score.score / score.maxScore * 100 : 0;
      const range = distribution.find((bucket) => percent >= bucket.min && percent < bucket.max);
      if (range) range.count += 1;
      const assessment = assessmentMap.get(score.assessmentName) ?? { total: 0, count: 0 };
      assessment.total += percent;
      assessment.count += 1;
      assessmentMap.set(score.assessmentName, assessment);
    });

    const scoreTrend = [...assessmentMap].slice(-10).map(([name, value]) => ({
      name: name.length > 14 ? `${name.slice(0, 14)}...` : name,
      average: Math.round(value.total / value.count),
    }));

    return { submissionByClass, distribution, scoreTrend };
  }, [assignments.data, classes.data, scores.data, summaries.data]);

  const summaryByAssignment = new Map((summaries.data ?? []).map((item) => [item.assignmentId, item]));
  const pending = (assignments.data ?? []).map((item) => ({ item, summary: summaryByAssignment.get(item.id) }))
    .filter(({ summary }) => summary && summary.submittedCount > summary.gradedCount + summary.redoCount).slice(0, 5);
  const funnel = FUNNEL_KEYS.map((item) => ({ ...item, value: totals[item.key] }));

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={ClipboardList} tone="warning" value={overview.waiting} label="Cần chấm" hint="Bài nộp đang chờ phản hồi" />
        <StatCard icon={CheckCheck} tone="success" value={`${overview.submittedPercent}%`} label="Đã nộp" hint={`${overview.submitted}/${overview.assigned} lượt được giao`} />
        <StatCard icon={BarChart3} tone="primary" value={overview.graded} label="Đã chấm" hint="Đã cập nhật vào sổ điểm" />
        <StatCard icon={RotateCcw} tone="danger" value={overview.redo} label="Cần làm lại" hint="Điểm tạm ẩn khỏi kết quả" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
        <ChartPanel title="Xu hướng kết quả" description="Điểm trung bình theo các bài đánh giá gần nhất" className="min-h-[340px]">
          {analytics.scoreTrend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.scoreTrend} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.3}/><stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 5" vertical={false}/><XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false}/><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value:number)=>[`${value}%`,"Trung bình"]}/><Area type="monotone" dataKey="average" stroke={CHART_PRIMARY} strokeWidth={3} fill="url(#scoreArea)" activeDot={{ r: 5, fill: "#fff", stroke: CHART_PRIMARY, strokeWidth: 3 }} isAnimationActive={!reducedMotion} animationDuration={280}/></AreaChart></ResponsiveContainer> : <ChartEmpty text="Chưa có dữ liệu điểm." />}
        </ChartPanel>

        <ChartPanel title="Luồng bài tập" description="Từ giao bài đến hoàn tất chấm" className="min-h-[340px]">
          <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] gap-2"><div className="min-h-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={funnel} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="82%" paddingAngle={3} cornerRadius={6} isAnimationActive={!reducedMotion} animationDuration={280}>{funnel.map((item)=><Cell key={item.key} fill={item.color}/>)}</Pie><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value:number)=>[`${value} lượt`,"Số lượng"]}/><text x="50%" y="47%" textAnchor="middle" fill="#1C1A15" fontSize="26" fontWeight="700">{totals.assigned}</text><text x="50%" y="57%" textAnchor="middle" fill={CHART_AXIS_TICK.fill} fontSize="11">lượt được giao</text></PieChart></ResponsiveContainer></div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">{funnel.map((item)=><div key={item.key} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-neutral-600"><i className="h-2 w-2 rounded-full" style={{background:item.color}} />{item.label}</span><strong className="tabular-nums text-neutral-900">{item.value}</strong></div>)}</div></div>
        </ChartPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Tỉ lệ nộp bài theo lớp" description="So sánh mức độ hoàn thành giữa các lớp" className="min-h-[330px]">
          {analytics.submissionByClass.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.submissionByClass} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}><CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 5" horizontal={false}/><XAxis type="number" domain={[0,100]} hide/><YAxis type="category" dataKey="name" width={100} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false}/><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value:number)=>[`${value}%`,"Đã nộp"]}/><Bar dataKey="percent" fill={CHART_PRIMARY} radius={[0,8,8,0]} barSize={18} isAnimationActive={!reducedMotion} animationDuration={280}/></BarChart></ResponsiveContainer> : <ChartEmpty text="Chưa có dữ liệu bài nộp." />}
        </ChartPanel>

        <ChartPanel title="Phân phối điểm" description="Số lượt đánh giá theo từng khoảng điểm" className="min-h-[330px]">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.distribution} margin={{ top: 12, right: 6, left: -20, bottom: 0 }}><CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 5" vertical={false}/><XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false}/><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value:number)=>[`${value} lượt`,"Số lượng"]}/><Bar dataKey="count" fill={CHART_PRIMARY_SOFT} radius={[8,8,2,2]} barSize={32} isAnimationActive={!reducedMotion} animationDuration={280}/></BarChart></ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4"><div><h2 className="text-sm font-semibold">Việc cần xử lý</h2><p className="mt-1 text-xs text-neutral-500">Bài nộp chưa được phản hồi</p></div><span className="rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700">{pending.length} bài</span></div>
        {pending.length ? <ul className="grid divide-y divide-neutral-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">{pending.map(({ item, summary }) => <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-4"><div><p className="text-sm font-medium text-neutral-900">{item.title}</p><p className="text-xs text-neutral-500">{(summary?.submittedCount ?? 0) - (summary?.gradedCount ?? 0) - (summary?.redoCount ?? 0)} bài nộp đang chờ</p></div><button type="button" onClick={onOpenAssignments} className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50 active:scale-[.98]">Mở</button></li>)}</ul> : <div className="p-8 text-center text-sm text-neutral-500">Không có bài nộp đang chờ chấm.</div>}
      </section>
    </div>
  );
}
