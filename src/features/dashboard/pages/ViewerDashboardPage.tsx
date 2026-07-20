import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  RefreshCw,
  Trophy,
  UserRound,
} from "lucide-react";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { CHART_AXIS_TICK, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { buildViewerDashboard } from "@/services/firestore/viewerDashboard";
import { getAcademicSettings } from "@/services/firestore/settings";
import type { AttendanceStatus } from "@/types/academic";
import { DEFAULT_RANK_THRESHOLDS, rankFromPercent, type AcademicRank } from "@/utils/ranking";

const RANK_META: Record<AcademicRank, { label: string; className: string }> = {
  S: { label: "Xuất sắc", className: "bg-primary-700 text-white" },
  A: { label: "Rất tốt", className: "bg-primary-600 text-white" },
  B: { label: "Đạt yêu cầu", className: "bg-primary-100 text-primary-800" },
  D: { label: "Cần hỗ trợ", className: "bg-warning-100 text-warning-900" },
};

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Có mặt",
  absent: "Vắng",
  late: "Đi muộn",
  excused: "Có phép",
};

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function MetricRing({ label, value, detail }: { label: string; value: number; detail: string }) {
  const data = [{ value, fill: CHART_PRIMARY }];
  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-2">
      <div className="relative h-28 w-28" aria-label={`${label}: ${value}%`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="76%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" background={{ fill: "#EFF4FF" }} cornerRadius={8} isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <strong className="absolute inset-0 grid place-items-center text-xl font-extrabold tabular-nums text-neutral-900">{value}%</strong>
      </div>
      <div>
        <p className="text-sm font-bold text-neutral-900">{label}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500">{detail}</p>
      </div>
    </div>
  );
}

export default function ViewerDashboardPage() {
  const { firebaseUser, userDoc } = useAuth();
  const reducedMotion = useReducedMotion();
  const studentIds = userDoc?.studentIds ?? [];
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const dashboard = useQuery({
    queryKey: ["viewer-dashboard", firebaseUser?.uid, studentIds],
    queryFn: () => buildViewerDashboard(studentIds),
    enabled: !!userDoc,
  });
  const academicSettings = useQuery({
    queryKey: ["settings", "academic"],
    queryFn: getAcademicSettings,
    enabled: !!userDoc,
  });
  const data = dashboard.data;

  useEffect(() => {
    if (!data?.students.length) return;
    if (!data.students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(data.students[0].id);
    }
  }, [data, selectedStudentId]);

  const overview = useMemo(() => {
    if (!data) return null;
    const student = data.students.find((item) => item.id === selectedStudentId) ?? data.students[0];
    if (!student) return null;
    const studentClasses = data.classes.filter((klass) => student.currentClassIds.includes(klass.id));
    const classIdSet = new Set(studentClasses.map((klass) => klass.id));
    const courseIdSet = new Set(studentClasses.map((klass) => klass.courseId));
    const courseNames = data.courses.filter((course) => courseIdSet.has(course.id)).map((course) => course.name);

    const attendance = data.attendanceHistory.filter((entry) => entry.studentId === student.id);
    const attendanceCounts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    attendance.forEach((entry) => { attendanceCounts[entry.status] += 1; });
    const attendanceRate = percent(attendanceCounts.present, attendance.length);

    const assignments = data.assignments.filter((assignment) => classIdSet.has(assignment.classId));
    const submissionByAssignment = new Map(
      data.submissions.filter((submission) => submission.studentId === student.id).map((submission) => [submission.assignmentId, submission]),
    );
    const completedAssignments = assignments.filter((assignment) => submissionByAssignment.has(assignment.id));
    const pendingAssignments = assignments
      .filter((assignment) => !submissionByAssignment.has(assignment.id))
      .sort((a, b) => a.dueAt.toMillis() - b.dueAt.toMillis());
    const assignmentRate = percent(completedAssignments.length, assignments.length);

    const scores = data.scores
      .filter((score) => score.studentId === student.id)
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
    const scoreAverage = scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + (score.score / score.maxScore) * 100, 0) / scores.length)
      : null;
    const scoreTrend = scores.slice(-7).map((score) => ({
      name: score.assessmentName,
      score: Math.round((score.score / score.maxScore) * 100),
    }));

    const nextSessions = data.nextSessions
      .filter((session) => classIdSet.has(session.classId) && session.status !== "cancelled")
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
    const announcements = data.announcements.filter((item) => !item.studentId || item.studentId === student.id);

    return {
      student,
      studentClasses,
      courseNames,
      attendanceCounts,
      attendanceTotal: attendance.length,
      attendanceRate,
      assignmentsTotal: assignments.length,
      completedAssignments: completedAssignments.length,
      assignmentRate,
      pendingAssignments,
      scoreAverage,
      scoreTrend,
      rank: rankFromPercent(scoreAverage, academicSettings.data?.rankThresholds ?? DEFAULT_RANK_THRESHOLDS),
      nextSessions,
      announcements,
    };
  }, [academicSettings.data?.rankThresholds, data, selectedStudentId]);

  return (
    <ViewerShell>
      <PageHeader
        actions={(
          <Button
            icon={<RefreshCw size={16} className={dashboard.isFetching ? "animate-spin" : ""} />}
            onClick={() => dashboard.refetch()}
            disabled={dashboard.isFetching}
          >
            {dashboard.isFetching ? "Đang cập nhật" : "Làm mới"}
          </Button>
        )}
      />

      {dashboard.isLoading && <LoadingSkeleton rows={6} />}
      {dashboard.error && <ErrorState message="Không thể tải dữ liệu tổng quan. Vui lòng kiểm tra kết nối và thử lại." onRetry={() => dashboard.refetch()} />}
      {!dashboard.isLoading && !dashboard.error && !overview && (
        <EmptyState title="Chưa liên kết học sinh" description="Tài khoản phụ huynh cần được liên kết với ít nhất một học sinh để hiển thị dashboard." />
      )}

      {data && overview && (
        <div className="space-y-4">
          {data.students.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Chọn học sinh">
              {data.students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  aria-pressed={overview.student.id === student.id}
                  className={`motion-control min-h-touch shrink-0 rounded-input border px-4 text-sm font-semibold active:scale-[.98] ${
                    overview.student.id === student.id
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-primary-300"
                  }`}
                >
                  {student.fullName}
                </button>
              ))}
            </div>
          )}

          <section className="overflow-hidden rounded-card border border-primary-100 bg-white shadow-[var(--shadow-1)]">
            <div className="grid lg:grid-cols-[1fr_250px]">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-card bg-primary-50 text-primary-700">
                    <UserRound size={24} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-700">Hồ sơ học tập</p>
                    <h2 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">{overview.student.fullName}</h2>
                    <p className="mt-1 text-sm text-neutral-500">Mã học sinh {overview.student.studentCode}</p>
                  </div>
                </div>
                <dl className="mt-6 grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-2">
                  <div>
                    <dt className="flex items-center gap-2 text-xs font-semibold text-neutral-500"><GraduationCap size={15} />Khóa học</dt>
                    <dd className="mt-1.5 text-sm font-bold text-neutral-900">{overview.courseNames.join(", ") || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-xs font-semibold text-neutral-500"><BookOpen size={15} />Lớp học</dt>
                    <dd className="mt-1.5 text-sm font-bold text-neutral-900">{overview.studentClasses.map((klass) => klass.name).join(", ") || "Chưa cập nhật"}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex items-center justify-between gap-4 bg-primary-700 p-5 text-white lg:flex-col lg:items-start lg:justify-center lg:p-6">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold text-primary-100"><Trophy size={16} />Xếp hạng từ Teacher</p>
                  <div className="mt-2 flex items-end gap-3">
                    <strong className="text-5xl font-black leading-none tracking-tighter">{overview.rank ?? "–"}</strong>
                    <span className="pb-1 text-sm font-semibold text-primary-100">
                      {overview.rank ? RANK_META[overview.rank].label : "Chưa đủ dữ liệu"}
                    </span>
                  </div>
                </div>
                <p className="max-w-[180px] text-right text-2xs leading-5 text-primary-100 lg:text-left">
                  Theo điểm đã công bố: S ≥ {academicSettings.data?.rankThresholds.S ?? DEFAULT_RANK_THRESHOLDS.S} · A ≥ {academicSettings.data?.rankThresholds.A ?? DEFAULT_RANK_THRESHOLDS.A} · B ≥ {academicSettings.data?.rankThresholds.B ?? DEFAULT_RANK_THRESHOLDS.B} · D thấp hơn
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <ChartPanel title="Nhịp học tập" description="Hai chỉ số quan trọng trong kỳ học hiện tại" className="min-h-[300px]">
              <div className="grid h-full content-center gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <MetricRing
                  label="Đánh giá chuyên cần"
                  value={overview.attendanceRate}
                  detail={`${overview.attendanceCounts.present}/${overview.attendanceTotal} lượt có mặt`}
                />
                <MetricRing
                  label="Tỉ lệ làm bài tập"
                  value={overview.assignmentRate}
                  detail={`${overview.completedAssignments}/${overview.assignmentsTotal} bài đã nộp`}
                />
              </div>
            </ChartPanel>

            <ChartPanel title="Tiến trình điểm số" description="7 đánh giá gần nhất đã được Teacher công bố" className="min-h-[300px]">
              {overview.scoreTrend.length === 0 ? (
                <div className="grid h-56 place-items-center text-sm text-neutral-500">Chưa có điểm được công bố.</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.scoreTrend} margin={{ top: 12, right: 8, left: -20, bottom: 0 }} aria-label="Biểu đồ tiến trình điểm số">
                      <defs>
                        <linearGradient id="viewerScoreArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`${value}%`, "Kết quả"]} />
                      <Area type="monotone" dataKey="score" stroke={CHART_PRIMARY} strokeWidth={3} fill="url(#viewerScoreArea)" isAnimationActive={!reducedMotion} animationDuration={280} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>
          </div>

          <section className="rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
            <div className="grid divide-y divide-neutral-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <DashboardList
                icon={<CalendarDays size={18} />}
                title="Lịch học sắp tới"
                empty="Chưa có buổi học sắp tới."
                link={{ to: ROUTES.VIEWER_SCHEDULE, label: "Xem lịch" }}
                items={overview.nextSessions.slice(0, 4).map((session) => ({
                  id: session.id,
                  title: data.classes.find((klass) => klass.id === session.classId)?.name ?? session.title,
                  meta: `${format(session.startAt.toDate(), "dd/MM · HH:mm")} · ${session.location || "Chưa cập nhật địa điểm"}`,
                }))}
              />
              <DashboardList
                icon={<ClipboardCheck size={18} />}
                title="Bài tập cần nộp"
                empty="Đã hoàn thành các bài tập hiện có."
                link={{ to: ROUTES.VIEWER_ASSIGNMENTS, label: "Xem bài tập" }}
                items={overview.pendingAssignments.slice(0, 4).map((assignment) => ({
                  id: assignment.id,
                  title: assignment.title,
                  meta: `Hạn nộp ${format(assignment.dueAt.toDate(), "dd/MM · HH:mm")}`,
                }))}
              />
              <DashboardList
                icon={<Bell size={18} />}
                title="Thông báo gần đây"
                empty="Chưa có thông báo mới."
                link={{ to: ROUTES.VIEWER_ANNOUNCEMENTS, label: "Xem tất cả" }}
                items={overview.announcements.slice(0, 4).map((item) => ({
                  id: item.id,
                  title: item.title,
                  meta: item.message || "Thông báo từ trung tâm",
                }))}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
            <span className="flex items-center gap-1.5 font-semibold text-neutral-800"><CheckCircle2 size={15} className="text-primary-600" />Chi tiết chuyên cần</span>
            {(Object.keys(ATTENDANCE_LABEL) as AttendanceStatus[]).map((status) => (
              <span key={status}>{ATTENDANCE_LABEL[status]}: <b className="tabular-nums text-neutral-900">{overview.attendanceCounts[status]}</b></span>
            ))}
          </div>
        </div>
      )}
    </ViewerShell>
  );
}

interface DashboardListItem { id: string; title: string; meta: string }

function DashboardList({
  icon,
  title,
  empty,
  items,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  items: DashboardListItem[];
  link: { to: string; label: string };
}) {
  return (
    <div className="min-w-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900"><span className="text-primary-600">{icon}</span>{title}</h2>
        <Link to={link.to} className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-900">
          {link.label}<ArrowRight size={14} />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-neutral-500">{empty}</p>
      ) : (
        <div className="mt-3 space-y-1">
          {items.map((item) => (
            <div key={item.id} className="rounded-input px-2 py-2.5 hover:bg-neutral-50">
              <p className="truncate text-sm font-semibold text-neutral-800">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-neutral-500">{item.meta}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
