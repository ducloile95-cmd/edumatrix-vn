import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BookOpenCheck, CalendarDays, ChevronRight, ClipboardCheck, Cloud, GraduationCap, MessageCircle, QrCode, Settings2, UserRound, UserX, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { CHART_AXIS_TICK, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { classroomSessionPath, ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listInvoices } from "@/services/firestore/invoices";
import { getAcademicSettings, getIntegrationSettings, getPaymentSettings } from "@/services/firestore/settings";
import { dashboardRange, getAdminDashboard, getDashboardLearning, getTeacherDashboard, type AdminDashboardData, type DashboardFilters, type TeacherDashboardData } from "@/services/firestore/staffDashboard";
import { listUsersByRole } from "@/services/firestore/users";
import { isGoogleDriveConfigured } from "@/services/integrations/googleDrive";
import { buildFinanceMetrics } from "@/utils/dashboardMetrics";
import { DEFAULT_RANK_THRESHOLDS } from "@/utils/ranking";

const FIELD_CLASS = "min-h-10 min-w-0 rounded-input border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium text-neutral-700 outline-none transition hover:border-neutral-300 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100";

function Panel({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="min-w-0 overflow-hidden rounded-card border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4"><div><h2 className="text-base font-bold tracking-tight text-neutral-900">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>}</div>{action}</div>{children}</section>;
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-2 pt-2 xl:flex-row xl:items-end xl:justify-between"><h2 className="shrink-0 text-lg font-bold tracking-tight text-neutral-950">{title}</h2>{action ?? (description && <p className="text-xs leading-5 text-neutral-500">{description}</p>)}</div>;
}

function MetricCell({ icon: Icon, value, label, hint, tone = "primary" }: { icon: LucideIcon; value: ReactNode; label: string; hint: string; tone?: "primary" | "warning" | "accent" }) {
  const colors = tone === "warning" ? "bg-warning-50 text-warning-700" : tone === "accent" ? "bg-accent-50 text-accent-700" : "bg-primary-50 text-primary-700";
  return <div className="min-w-0 px-4 py-4 sm:px-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-neutral-500">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-neutral-950 tabular-nums">{value}</p></div><span className={`grid size-9 shrink-0 place-items-center rounded-input ${colors}`}><Icon size={17} strokeWidth={1.8} /></span></div><p className="mt-2 truncate text-xs text-neutral-500" title={hint}>{hint}</p></div>;
}

function StaffGreeting({ name, intro, metrics }: { name: string; intro: string; metrics: { label: string; value: number; icon: LucideIcon }[] }) {
  return <section className="mb-5 overflow-hidden rounded-card border border-primary-100 bg-primary-50/70" aria-label={`Lời chào dành cho ${name}`}>
    <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)] lg:items-center lg:px-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-neutral-950"><span className="text-primary-700">Xin chào!</span> {name}</h2>
        <p className="mt-1.5 text-sm leading-6 text-neutral-600">{intro}</p>
      </div>
      <dl className="grid overflow-hidden rounded-input border border-primary-100 bg-white sm:grid-cols-3 sm:divide-x sm:divide-primary-100">
        {metrics.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 border-b border-primary-100 px-4 py-3 last:border-b-0 sm:border-b-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-input bg-primary-50 text-primary-700"><Icon size={17} strokeWidth={1.8} /></span>
          <div className="min-w-0"><dt className="text-xs font-semibold text-neutral-500">{label}</dt><dd className="mt-0.5 text-xl font-black tabular-nums text-neutral-950">{value}</dd></div>
        </div>)}
      </dl>
    </div>
    <p className="border-t border-primary-100 bg-white/70 px-5 py-2.5 text-xs font-semibold text-primary-800 lg:px-6">Edumatrix chúc Thầy cô và trò học tốt, dạy tốt!</p>
  </section>;
}

function QueryPanel({ loading, error, retry, children }: { loading: boolean; error: boolean; retry: () => void; children: ReactNode }) {
  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorState message="Không tải được khu vực này." onRetry={retry} />;
  return <>{children}</>;
}

function money(value: number): string { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }

const ACTION_ROUTES = {
  attendance: ROUTES.STAFF_ATTENDANCE,
  grading: ROUTES.STAFF_ASSIGNMENTS,
  homework: ROUTES.STAFF_ASSIGNMENTS,
  leave: ROUTES.STAFF_ATTENDANCE,
  lesson: ROUTES.STAFF_LESSON_PLANS,
};

export default function StaffDashboardPage() {
  const { firebaseUser, role, userDoc } = useAuth();
  const isAdmin = role === USER_ROLES.ADMIN;
  const reducedMotion = useReducedMotion();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const range = useMemo(() => dashboardRange(days), [days]);

  const classes = useQuery({ queryKey: ["dashboard-filter-classes", role, firebaseUser?.uid], queryFn: listClasses, enabled: !!firebaseUser });
  const courses = useQuery({ queryKey: ["dashboard-filter-courses"], queryFn: listCourses, enabled: isAdmin });
  const teachers = useQuery({ queryKey: ["dashboard-filter-teachers"], queryFn: () => listUsersByRole("teacher"), enabled: isAdmin });
  const academic = useQuery({ queryKey: ["settings", "academic"], queryFn: getAcademicSettings, enabled: !!firebaseUser });
  const overview = useQuery<AdminDashboardData | TeacherDashboardData>({
    queryKey: ["staff-dashboard", "overview", role, firebaseUser?.uid, days, filters],
    queryFn: () => isAdmin ? getAdminDashboard(range, filters) : getTeacherDashboard(firebaseUser?.uid ?? "", range, filters),
    enabled: !!firebaseUser && (isAdmin || role === USER_ROLES.TEACHER),
  });
  const learning = useQuery({
    queryKey: ["staff-dashboard", "learning", role, firebaseUser?.uid, days, filters, academic.data?.rankThresholds],
    queryFn: () => getDashboardLearning(range, filters, academic.data?.rankThresholds ?? DEFAULT_RANK_THRESHOLDS),
    enabled: !!firebaseUser && academic.isSuccess,
  });
  const finance = useQuery({
    queryKey: ["staff-dashboard", "finance", role, firebaseUser?.uid, days, filters.classId, filters.courseId, filters.teacherId],
    queryFn: listInvoices,
    enabled: !!firebaseUser,
  });
  const integrationSettings = useQuery({ queryKey: ["settings", "integrations"], queryFn: getIntegrationSettings, enabled: isAdmin });
  const paymentSettings = useQuery({ queryKey: ["settings", "payment"], queryFn: getPaymentSettings, enabled: isAdmin });
  const filteredFinanceInvoices = useMemo(() => {
    const scopedClasses = (classes.data ?? []).filter((klass) =>
      (!filters.classId || klass.id === filters.classId) &&
      (!filters.courseId || klass.courseId === filters.courseId) &&
      (!filters.teacherId || klass.teacherIds.includes(filters.teacherId)),
    );
    const scopedStudentIds = new Set(scopedClasses.flatMap((klass) => klass.studentIds));
    return (finance.data ?? []).filter((invoice) =>
      (!filters.courseId || invoice.courseId === filters.courseId) &&
      ((!filters.classId && !filters.teacherId) || scopedStudentIds.has(invoice.studentId)),
    );
  }, [classes.data, filters.classId, filters.courseId, filters.teacherId, finance.data]);
  const financeMetrics = useMemo(() => buildFinanceMetrics(filteredFinanceInvoices), [filteredFinanceInvoices]);
  const teacherWorkload = useMemo(() => (teachers.data ?? []).map((teacher) => {
    const assignedClasses = (classes.data ?? []).filter((klass) => klass.teacherIds.includes(teacher.uid) && (!filters.courseId || klass.courseId === filters.courseId));
    return { uid: teacher.uid, name: teacher.displayName, classes: assignedClasses.length, students: new Set(assignedClasses.flatMap((klass) => klass.studentIds)).size };
  }), [classes.data, filters.courseId, teachers.data]);
  const activeTeacherCount = (teachers.data ?? []).filter((teacher) => teacher.status === "active").length;
  return <AppShell>

    {overview.data && (!isAdmin || teachers.isSuccess) && <StaffGreeting
      name={userDoc?.displayName?.trim() || firebaseUser?.displayName?.trim() || (isAdmin ? "Admin" : "Thầy/cô")}
      intro={isAdmin ? "Tổng quan vận hành hôm nay:" : "Hôm nay Thầy/cô có:"}
      metrics={isAdmin ? [
        { label: "Tài khoản giáo viên đang hoạt động", value: activeTeacherCount, icon: UserRound },
        { label: "Tổng số lớp đang hoạt động", value: overview.data.activeClasses, icon: GraduationCap },
        { label: "Lớp ngày hôm nay", value: overview.data.today.total, icon: CalendarDays },
      ] : [
        { label: "Tổng số lớp", value: overview.data.activeClasses, icon: GraduationCap },
        { label: "Buổi dạy hôm nay", value: overview.data.today.total, icon: CalendarDays },
        { label: "Còn cần giải quyết", value: overview.data.actions.reduce((total, action) => total + action.count, 0), icon: ClipboardCheck },
      ]}
    />}

    <div className="space-y-4">
      <QueryPanel loading={overview.isLoading} error={overview.isError} retry={() => overview.refetch()}>
        {overview.data && <>
          <SectionHeader
            title="Nhịp vận hành hôm nay"
            description="Các chỉ số cần xem trước khi bắt đầu công việc."
            action={<div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto xl:justify-end" aria-label="Phạm vi dữ liệu">
              <div className="flex shrink-0 rounded-input bg-neutral-100 p-1" aria-label="Khoảng thời gian">{([7, 30, 90] as const).map((value) => <button key={value} type="button" onClick={() => setDays(value)} className={`min-h-8 flex-1 rounded-[7px] px-3 text-xs font-bold transition sm:flex-none ${days === value ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>{value} ngày</button>)}</div>
              {isAdmin && <select aria-label="Khóa học" value={filters.courseId ?? ""} onChange={(event) => setFilters((current) => ({ ...current, courseId: event.target.value || undefined, classId: undefined }))} className={`${FIELD_CLASS} w-full sm:w-44`}><option value="">Tất cả khóa học</option>{courses.data?.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select>}
              <select aria-label={isAdmin ? "Lớp học" : "Lớp phụ trách"} value={filters.classId ?? ""} onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value || undefined }))} className={`${FIELD_CLASS} w-full sm:w-44`}><option value="">{isAdmin ? "Tất cả lớp" : "Lớp phụ trách"}</option>{classes.data?.filter((klass) => !filters.courseId || klass.courseId === filters.courseId).map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}</select>
              {isAdmin && <select aria-label="Giáo viên" value={filters.teacherId ?? ""} onChange={(event) => setFilters((current) => ({ ...current, teacherId: event.target.value || undefined }))} className={`${FIELD_CLASS} w-full sm:w-44`}><option value="">Tất cả giáo viên</option>{teachers.data?.map((teacher) => <option key={teacher.uid} value={teacher.uid}>{teacher.displayName}</option>)}</select>}
            </div>}
          />
          <section className="mt-3 grid overflow-hidden rounded-card border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 [&>*]:border-neutral-100 [&>*:not(:last-child)]:border-b sm:[&>*]:border-b sm:[&>*]:border-r xl:[&>*]:border-b-0">
            <MetricCell icon={CalendarDays} value={overview.data.today.total} label={isAdmin ? "Buổi học hôm nay" : "Buổi dạy hôm nay"} hint={`${overview.data.today.done} đã xong · ${overview.data.today.upcoming} sắp tới`} />
            <MetricCell icon={GraduationCap} value={overview.data.activeClasses} label="Lớp đang hoạt động" hint={isAdmin ? "Theo bộ lọc hiện tại" : "Được phân công"} />
            <MetricCell icon={UserRound} value={overview.data.activeStudents} label={isAdmin ? "Học sinh active" : "Học sinh phụ trách"} hint="Không trùng học sinh" />
            <MetricCell icon={UserX} value={overview.data.absentLateToday} label="Vắng hoặc muộn" hint="Các buổi hôm nay" tone="warning" />
            <MetricCell icon={ClipboardCheck} value={overview.data.ungraded} label="Bài chờ chấm" hint="Đã nộp, chưa chấm" tone="accent" />
            <MetricCell icon={BookOpenCheck} value={overview.data.lessonPlanGaps} label="Thiếu giáo án" hint="Trong 7 ngày tới" tone="warning" />
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
            <Panel title={isAdmin ? "Lịch hôm nay" : "Lịch giảng dạy hôm nay"} description="Giờ, lớp, địa điểm và sĩ số."><div className="p-4">{overview.data.sessions.length === 0 ? <EmptyState title="Không có lịch hôm nay" description="Không có buổi học phù hợp với bộ lọc." /> : <ul className="divide-y divide-neutral-100">{overview.data.sessions.map((session) => <li key={session.id} className="flex flex-wrap items-center gap-3 py-3"><span className="min-w-14 rounded-input bg-primary-50 px-2 py-1.5 text-center text-xs font-bold tabular-nums text-primary-700">{format(session.startAt, "HH:mm")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-neutral-900">{session.className}</p><p className="truncate text-xs text-neutral-500">{session.location || "Chưa có địa điểm"} · {session.studentCount} học sinh</p></div><Link to={classroomSessionPath(session.id)} className="inline-flex min-h-10 items-center rounded-input bg-primary-600 px-3 text-xs font-bold text-white hover:bg-primary-700">Mở buổi học</Link></li>)}</ul>}</div></Panel>
            <Panel title="Hàng đợi xử lý" description="Mỗi mục dẫn tới module đã lọc."><div className="px-5">{overview.data.actions.length === 0 ? <EmptyState title="Không còn việc tồn" description="Các tác vụ hiện tại đã được xử lý." /> : overview.data.actions.map((action) => <Link key={action.id} to={`${ACTION_ROUTES[action.kind]}?dashboard=${action.kind}`} className="flex min-h-touch items-center gap-3 border-b border-neutral-100 py-3 last:border-0 hover:bg-neutral-50"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-warning-50 text-sm font-black text-warning-800">{action.count}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-neutral-900">{action.label}</span><span className="block truncate text-xs text-neutral-500">{action.detail}</span></span><ChevronRight size={16} className="text-neutral-300" /></Link>)}</div></Panel>
          </div>
        </>}
      </QueryPanel>

      <QueryPanel loading={learning.isLoading} error={learning.isError || academic.isError} retry={() => { academic.refetch(); learning.refetch(); }}>
        {learning.data && <>
          <SectionHeader title="Chất lượng học tập" description={`Tổng hợp theo phạm vi ${days} ngày và bộ lọc hiện tại.`} />
          <section className="mt-3 grid overflow-hidden rounded-card border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:grid-cols-3 [&>*:not(:last-child)]:border-b sm:[&>*:not(:last-child)]:border-b-0 sm:[&>*:not(:last-child)]:border-r [&>*]:border-neutral-100">
            <MetricCell icon={CalendarDays} value={`${learning.data.attendanceRate}%`} label="Tỉ lệ chuyên cần" hint={`Trong ${days} ngày`} />
            <MetricCell icon={ClipboardCheck} value={`${learning.data.assignmentRate}%`} label="Hoàn thành bài tập" hint={`Trong ${days} ngày`} tone="accent" />
            <MetricCell icon={GraduationCap} value={`${learning.data.averageScore}%`} label="Điểm trung bình" hint="Theo điểm đã công bố" />
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartPanel title={`Chuyên cần ${days} ngày`} description="Tỉ lệ có mặt theo ngày" className="min-h-[300px]"><div className="h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={learning.data.attendanceTrend}><XAxis dataKey="date" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} minTickGap={22} /><YAxis domain={[0, 100]} unit="%" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} /><Line type="monotone" dataKey="rate" stroke={CHART_PRIMARY} strokeWidth={3} dot={false} isAnimationActive={!reducedMotion} /></LineChart></ResponsiveContainer></div></ChartPanel>
            <ChartPanel title="Phân bố xếp hạng S/A/B/D" description="Dùng thang chung do Admin cấu hình" className="min-h-[300px]"><div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={learning.data.rankDistribution}><XAxis dataKey="rank" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} /><Bar dataKey="count" fill={CHART_PRIMARY} radius={[8, 8, 0, 0]} isAnimationActive={!reducedMotion} /></BarChart></ResponsiveContainer></div></ChartPanel>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <Panel title={isAdmin ? "So sánh chất lượng theo lớp" : "Chất lượng các lớp phụ trách"} description="Chuyên cần, bài tập và điểm trung bình."><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">Lớp</th><th className="px-4 py-3">Chuyên cần</th><th className="px-4 py-3">Bài tập</th><th className="px-4 py-3">Điểm TB</th></tr></thead><tbody>{learning.data.classMetrics.map((item) => <tr key={item.classId} className="border-t border-neutral-100"><td className="px-5 py-3 font-bold text-neutral-900">{item.className}</td><td className="px-4 py-3 tabular-nums">{item.attendance}%</td><td className="px-4 py-3 tabular-nums">{item.assignments}%</td><td className="px-4 py-3 tabular-nums">{item.averageScore}%</td></tr>)}</tbody></table></div></Panel>
            <Panel title="Học sinh cần chú ý" description="Hiển thị từng nguyên nhân để có thể xử lý ngay."><div className="max-h-[390px] overflow-y-auto px-5">{learning.data.atRiskStudents.length === 0 ? <EmptyState title="Chưa có cảnh báo" description="Không có học sinh chạm ngưỡng cảnh báo." /> : <ul>{learning.data.atRiskStudents.slice(0, 20).map((student) => <li key={student.id} className="border-b border-neutral-100 py-4 last:border-0"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate font-bold text-neutral-900">{student.name}</p><p className="mt-0.5 truncate text-xs text-neutral-500">{student.classNames.join(", ") || "Chưa có lớp"}</p></div>{student.rank && <span className="shrink-0 rounded-input bg-warning-50 px-2 py-1 text-xs font-black text-warning-800">Hạng {student.rank}</span>}</div><ul className="mt-2 space-y-1 text-xs text-warning-900">{student.reasons.map((reason) => <li key={reason} className="flex gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{reason}</li>)}</ul></li>)}</ul>}</div></Panel>
          </div>
          {!isAdmin && <Panel title="Phân tích từng học sinh" description="Xu hướng điểm, chuyên cần, bài tập, số lần làm lại và nhận xét gần nhất."><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">Học sinh</th><th className="px-4 py-3">Hạng</th><th className="px-4 py-3">Chuyên cần</th><th className="px-4 py-3">Bài tập</th><th className="px-4 py-3">3 điểm gần nhất</th><th className="px-4 py-3">Làm lại</th><th className="px-4 py-3">Nhận xét</th></tr></thead><tbody>{learning.data.studentInsights.map((student) => <tr key={student.id} className="border-t border-neutral-100 transition hover:bg-neutral-50/70"><td className="px-5 py-3"><p className="font-bold text-neutral-900">{student.name}</p><p className="text-xs text-neutral-500">{student.classNames.join(", ")}</p></td><td className="px-4 py-3 font-black">{student.rank ?? "Chưa có"}</td><td className="px-4 py-3 tabular-nums">{student.attendanceRate}%</td><td className="px-4 py-3 tabular-nums">{student.assignmentRate}%</td><td className="px-4 py-3 tabular-nums">{student.scoreTrend.length ? student.scoreTrend.join(" → ") : "Chưa có"}</td><td className="px-4 py-3 tabular-nums">{student.redoCount}</td><td className="max-w-56 truncate px-4 py-3 text-xs text-neutral-600" title={student.latestComment}>{student.latestComment || "Chưa có"}</td></tr>)}</tbody></table></div></Panel>}
          {isAdmin && <Panel title="Khối lượng giảng dạy theo Teacher" description="Số lớp và học sinh không trùng của mỗi giáo viên."><div className="divide-y divide-neutral-100 px-5">{teacherWorkload.map((teacher) => <div key={teacher.uid} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-5 py-3.5"><p className="truncate text-sm font-bold text-neutral-900">{teacher.name}</p><p className="text-xs text-neutral-500"><b className="text-base text-primary-700 tabular-nums">{teacher.classes}</b> lớp</p><p className="text-xs text-neutral-500"><b className="text-base text-primary-700 tabular-nums">{teacher.students}</b> học sinh</p></div>)}</div></Panel>}
        </>}
      </QueryPanel>

      <QueryPanel loading={finance.isLoading} error={finance.isError} retry={() => finance.refetch()}>
        <><SectionHeader title="Tài chính" description={isAdmin ? "Theo dõi thu học phí và tuổi nợ toàn trung tâm." : "Dữ liệu chỉ đọc của học sinh thuộc lớp phụ trách."} /><Panel title={isAdmin ? "Tài chính và công nợ" : "Tài chính học sinh phụ trách"} description={isAdmin ? "Các số liệu tài chính theo phạm vi đã chọn." : "Teacher không thể tạo hóa đơn hoặc đối soát thanh toán."} action={<Link to={ROUTES.STAFF_INVOICES} className="inline-flex min-h-9 items-center rounded-input px-3 text-xs font-bold text-primary-700 hover:bg-primary-50">Mở module học phí</Link>}><div className="grid divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"><div className="p-5"><p className="text-xs font-semibold text-neutral-500">Chưa thu</p><p className="mt-1 text-xl font-black text-neutral-900">{money(financeMetrics.outstandingAmount)}</p></div><div className="p-5"><p className="text-xs font-semibold text-neutral-500">Quá hạn</p><p className="mt-1 text-xl font-black text-danger-700">{money(financeMetrics.overdueAmount)}</p></div><div className="p-5"><p className="text-xs font-semibold text-neutral-500">Chờ xác nhận</p><p className="mt-1 text-xl font-black text-neutral-900">{financeMetrics.pendingCount}</p></div>{isAdmin && <div className="p-5"><p className="text-xs font-semibold text-neutral-500">Tỉ lệ thu</p><p className="mt-1 text-xl font-black text-success-700">{financeMetrics.collectionRate}%</p></div>}</div>{isAdmin && <div className="h-52 border-t border-neutral-100 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={financeMetrics.aging} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="label" width={90} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => money(value)} /><Bar dataKey="amount" fill={CHART_PRIMARY} radius={[0, 8, 8, 0]} isAnimationActive={!reducedMotion} /></BarChart></ResponsiveContainer></div>}</Panel></>
      </QueryPanel>

      {isAdmin && <Panel title="Trạng thái vận hành" description="Các kết nối dành riêng cho Admin." action={<Link to={`${ROUTES.STAFF_SETTINGS}?section=integrations`} className="inline-flex items-center gap-1 text-xs font-bold text-primary-700"><Settings2 size={14} />Quản lý</Link>}><div className="grid md:grid-cols-3"><div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 md:border-b-0 md:border-r"><Cloud size={18} className="text-primary-600" /><p className="text-xs font-bold">Google Drive<br /><span className="font-normal text-neutral-500">{isGoogleDriveConfigured() && integrationSettings.data?.driveFolderId ? "Sẵn sàng" : "Cần cấu hình"}</span></p></div><div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 md:border-b-0 md:border-r"><MessageCircle size={18} className="text-primary-600" /><p className="text-xs font-bold">Messenger Worker<br /><span className="font-normal text-neutral-500">{import.meta.env.VITE_MESSENGER_WORKER_URL ? "Đã kết nối" : "Thiếu endpoint"}</span></p></div><div className="flex items-center gap-3 px-5 py-4"><QrCode size={18} className="text-primary-600" /><p className="text-xs font-bold">VietQR<br /><span className="font-normal text-neutral-500">{paymentSettings.data?.accountNumber ? "Đã thiết lập" : "Cần thiết lập"}</span></p></div></div></Panel>}
    </div>
  </AppShell>;
}
