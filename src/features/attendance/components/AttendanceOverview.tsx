import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, subDays } from "date-fns";
import { AlertTriangle, CalendarClock, ClipboardCheck, TrendingUp, UserX } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { ChartGradientDefs, CHART_DEPTH_FILTER, CHART_GRADIENT } from "@/components/charts/ChartGradientDefs";
import { CHART_AXIS_TICK, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import { listClasses } from "@/services/firestore/classes";
import { listStudents } from "@/services/firestore/students";
import { listSessions } from "@/services/firestore/sessions";
import { getAttendanceOverview, listAttendanceSummariesBySessionIds } from "@/services/firestore/attendance";
import { formatSessionLabel } from "@/utils/lessonPlan";
import type { AttendanceStatus } from "@/types/academic";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AttendanceOverviewProps {
  onJumpToSession: (sessionId: string) => void;
}

/** Nhan/mau dung chung voi AttendanceMarkPanel - "absent"/"excused" hien la "khong phep"/"co phep". */
const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "Có mặt", late: "Đi muộn", absent: "Vắng không phép", excused: "Vắng có phép" };

export function AttendanceOverview({ onJumpToSession }: AttendanceOverviewProps) {
  const reducedMotion = useReducedMotion();
  const overview = useQuery({ queryKey: ["attendance-overview"], queryFn: () => getAttendanceOverview(30) });
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const classById = useMemo(() => new Map((classes.data ?? []).map((item) => [item.id, item])), [classes.data]);
  const studentById = useMemo(() => new Map((students.data ?? []).map((item) => [item.id, item])), [students.data]);

  const trendRangeStart = useMemo(() => subDays(new Date(), 60), []);
  const trendSessions = useQuery({ queryKey: ["attendance-trend-sessions"], queryFn: () => listSessions(trendRangeStart, new Date()) });
  const trendSessionIds = useMemo(() => trendSessions.data?.map((item) => item.id) ?? [], [trendSessions.data]);
  const trendSummaries = useQuery({
    queryKey: ["attendance-trend-summaries", trendSessionIds],
    queryFn: () => listAttendanceSummariesBySessionIds(trendSessionIds),
    enabled: trendSessionIds.length > 0,
  });

  const weeklyChart = useMemo(() => {
    if (!trendSummaries.data || !trendSessions.data) return [];
    const sessionById = new Map(trendSessions.data.map((item) => [item.id, item]));
    const buckets = new Map<string, { week: string; sortKey: number; present: number; late: number; absent: number; excused: number }>();
    trendSummaries.data.forEach((summary) => {
      const session = sessionById.get(summary.sessionId);
      if (!session) return;
      const weekStart = startOfWeek(session.startAt.toDate(), { weekStartsOn: 1 });
      const key = format(weekStart, "dd/MM");
      const bucket = buckets.get(key) ?? { week: key, sortKey: weekStart.getTime(), present: 0, late: 0, absent: 0, excused: 0 };
      bucket.present += summary.present;
      bucket.late += summary.late;
      bucket.absent += summary.absent;
      bucket.excused += summary.excused;
      buckets.set(key, bucket);
    });
    return [...buckets.values()].sort((a, b) => a.sortKey - b.sortKey).slice(-8);
  }, [trendSummaries.data, trendSessions.data]);

  const donutData = useMemo(() => {
    const totals: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    trendSummaries.data?.forEach((summary) => {
      totals.present += summary.present;
      totals.absent += summary.absent;
      totals.late += summary.late;
      totals.excused += summary.excused;
    });
    return (Object.keys(totals) as AttendanceStatus[])
      .map((status) => ({ status, label: STATUS_LABEL[status], value: totals[status] }))
      .filter((item) => item.value > 0);
  }, [trendSummaries.data]);

  if (overview.isLoading) return <LoadingSkeleton rows={6} />;
  if (overview.isError || !overview.data) return <ErrorState message="Không tải được tổng quan điểm danh." onRetry={() => overview.refetch()} />;

  const data = overview.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} tone="primary" value={`${data.avgRatePercent}%`} label="Tỷ lệ chuyên cần TB" hint="30 ngày gần nhất" />
        <StatCard icon={ClipboardCheck} tone="success" value={data.sessionsMarked} label="Buổi đã điểm danh" hint="30 ngày gần nhất" />
        <StatCard icon={CalendarClock} tone="warning" value={data.gapSessions.length} label="Buổi chưa điểm danh" hint="14 ngày gần nhất" />
        <StatCard icon={UserX} tone="danger" value={data.atRiskStudents.length} label="Nghỉ không phép nhiều" hint="≥ 20% buổi trong 30 ngày" />
      </div>

      {data.gapSessions.length > 0 && (
        <div className="rounded-card border border-warning-100 bg-warning-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-warning-700">
            <AlertTriangle size={16} /> Buổi học chưa điểm danh
          </p>
          <div className="space-y-2">
            {data.gapSessions.map((session) => (
              <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-warning-100 bg-white px-3 py-2">
                <p className="text-sm font-semibold text-neutral-900">
                  {classById.get(session.classId)?.name ?? "Lớp"} · {formatSessionLabel(session)}
                </p>
                <Button size="sm" onClick={() => onJumpToSession(session.id)}>Điểm danh ngay</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.upcomingLeaves.length > 0 && (
        <div className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="mb-1 text-base font-semibold text-neutral-900">Nghỉ học đã đăng ký trước</h2>
          <p className="mb-3 text-sm text-neutral-500">Buổi sắp tới (14 ngày tới) đã có học sinh báo nghỉ.</p>
          <div className="space-y-2">
            {data.upcomingLeaves.map((leave) => (
              <div key={leave.id} className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-neutral-200 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {studentById.get(leave.studentId)?.fullName ?? "Học sinh"} · {classById.get(leave.classId)?.name ?? "Lớp"}
                  </p>
                  {leave.note && <p className="truncate text-xs text-neutral-500">{leave.note}</p>}
                </div>
                <StatusBadge tone={leave.status === "excused" ? "info" : "danger"}>
                  {leave.status === "excused" ? "Có phép" : "Không phép"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartPanel title="Xu hướng chuyên cần theo tuần" description="Tổng hợp các buổi đã điểm danh trong 8 tuần gần đây" className="min-h-[340px]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} aria-label="Biểu đồ chuyên cần theo tuần, chia theo có mặt, đi muộn, vắng không phép và vắng có phép">
                {ChartGradientDefs()}
                <XAxis dataKey="week" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="present" name={STATUS_LABEL.present} stackId="a" fill={CHART_GRADIENT.success} filter={CHART_DEPTH_FILTER} isAnimationActive={!reducedMotion} animationDuration={280} />
                <Bar dataKey="late" name={STATUS_LABEL.late} stackId="a" fill={CHART_GRADIENT.warning} filter={CHART_DEPTH_FILTER} isAnimationActive={!reducedMotion} animationDuration={280} />
                <Bar dataKey="absent" name={STATUS_LABEL.absent} stackId="a" fill={CHART_GRADIENT.danger} filter={CHART_DEPTH_FILTER} isAnimationActive={!reducedMotion} animationDuration={280} />
                <Bar dataKey="excused" name={STATUS_LABEL.excused} stackId="a" fill={CHART_GRADIENT.info} filter={CHART_DEPTH_FILTER} radius={[9, 9, 2, 2]} isAnimationActive={!reducedMotion} animationDuration={280} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Tổng hợp trạng thái" description="Cơ cấu chuyên cần trong khoảng đang xem" className="min-h-[340px]">
          <div className="h-64">
            {donutData.length === 0 ? (
              <p className="mt-8 text-center text-sm text-neutral-500">Chưa có dữ liệu điểm danh.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart aria-label="Biểu đồ tròn tổng hợp trạng thái điểm danh">
                  {ChartGradientDefs()}
                  <Pie data={donutData} dataKey="value" nameKey="label" innerRadius="56%" outerRadius="84%" paddingAngle={4} cornerRadius={8} filter={CHART_DEPTH_FILTER} isAnimationActive={!reducedMotion} animationDuration={280}>
                    {donutData.map((item) => (
                      <Cell key={item.status} fill={CHART_GRADIENT[item.status === "present" ? "success" : item.status === "late" ? "warning" : item.status === "absent" ? "danger" : "info"]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number, _name, entry) => [`${value} lượt`, entry.payload.label]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="mb-1 text-base font-semibold text-neutral-900">Theo lớp</h2>
          <p className="mb-3 text-sm text-neutral-500">Tỷ lệ chuyên cần từng lớp, 30 ngày gần đây.</p>
          {data.perClass.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Chưa có buổi nào được điểm danh trong 30 ngày qua." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.perClass.map((item) => (
                <li key={item.classId} className="flex items-center gap-3 py-2.5">
                  <span className="w-40 shrink-0 truncate text-sm font-medium text-neutral-800">{item.className}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <span
                      className={`block h-full rounded-full ${item.ratePercent >= 90 ? "bg-success-500" : item.ratePercent >= 75 ? "bg-warning-500" : "bg-danger-500"}`}
                      style={{ width: `${item.ratePercent}%` }}
                    />
                  </span>
                  <span className="w-11 shrink-0 text-right text-sm font-bold tabular-nums text-neutral-800">{item.ratePercent}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="mb-1 text-base font-semibold text-neutral-900">Học sinh nghỉ không phép nhiều</h2>
          <p className="mb-3 text-sm text-neutral-500">Vắng không phép ≥ 20% trong 30 ngày, tối thiểu 3 buổi đã điểm danh.</p>
          {data.atRiskStudents.length === 0 ? (
            <EmptyState title="Không có học sinh cần chú ý" description="Chưa có học sinh nào vắng không phép vượt ngưỡng." />
          ) : (
            <ul className="space-y-2">
              {data.atRiskStudents.map((student) => (
                <li key={student.studentId} className="flex items-center justify-between gap-2 rounded-input border border-neutral-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{student.fullName}</p>
                    <p className="text-xs text-neutral-500">{student.className ?? "Chưa gắn lớp"} · {student.absentCount}/{student.totalMarked} buổi vắng không phép</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-danger-700">{student.ratePercent}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
