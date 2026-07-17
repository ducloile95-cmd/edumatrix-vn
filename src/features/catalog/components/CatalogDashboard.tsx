import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BookOpen, CheckCircle2, GraduationCap, AlertTriangle } from "lucide-react";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { formatVnd } from "@/utils/currency";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { ChartGradientDefs, CHART_DEPTH_FILTER, CHART_GRADIENT } from "@/components/charts/ChartGradientDefs";
import { CHART_AXIS_TICK, CHART_NEUTRAL, CHART_SUCCESS, CHART_TOOLTIP_STYLE, CHART_WARNING } from "@/components/charts/chartTheme";
import type { CourseStatus } from "@/types/academic";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface CatalogDashboardProps {
  /** Bam "Thêm khóa học" tren mon con thieu -> chuyen sang tab Danh muc, mo CourseForm voi mon da chon san. */
  onCreateCourseForSubject: (subjectId: string) => void;
}

const STATUS_LABEL: Record<CourseStatus, string> = { draft: "Nháp", active: "Đang mở", completed: "Đã kết thúc" };
const STATUS_COLOR: Record<CourseStatus, string> = { draft: CHART_WARNING, active: CHART_SUCCESS, completed: CHART_NEUTRAL };
const TUITION_BUCKET_SIZE = 20_000;

/** Khoa cu chua co pricePerSession (chua duoc Admin mo sua lai) -> tam tinh tu tuitionFee/totalSessions. */
function pricePerSession(course: { pricePerSession?: number; tuitionFee: number; totalSessions: number }): number {
  return course.pricePerSession ?? Math.round(course.tuitionFee / course.totalSessions);
}

export function CatalogDashboard({ onCreateCourseForSubject }: CatalogDashboardProps) {
  const reducedMotion = useReducedMotion();
  // Tai dung listCourses()/listSubjects() - cung queryKey voi CourseForm/CoursesList/SubjectsList
  // nen chia se cache React Query, khong phat sinh loai truy van Firestore moi (ke hoach muc 3).
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });

  const isLoading = coursesQuery.isLoading || subjectsQuery.isLoading;
  const isError = coursesQuery.isError || subjectsQuery.isError;

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);

  const kpi = useMemo(() => {
    const draft = courses.filter((c) => c.status === "draft").length;
    const active = courses.filter((c) => c.status === "active").length;
    const completed = courses.filter((c) => c.status === "completed").length;
    const activeSubjects = subjects.filter((s) => s.status === "active");
    const archivedSubjects = subjects.length - activeSubjects.length;
    const subjectsWithoutCourse = subjects.filter(
      (s) => !courses.some((c) => c.subjectIds.includes(s.id)),
    );
    return {
      total: courses.length,
      draft,
      active,
      completed,
      activeSubjectsCount: activeSubjects.length,
      archivedSubjects,
      subjectsWithoutCourse,
    };
  }, [courses, subjects]);

  const statusData = useMemo(
    () =>
      (["draft", "active", "completed"] as CourseStatus[]).map((status) => ({
        status: STATUS_LABEL[status],
        count: courses.filter((c) => c.status === status).length,
        fill: STATUS_COLOR[status],
      })),
    [courses],
  );

  const subjectData = useMemo(() => {
    const counts = subjects.map((subject) => ({
      name: subject.name,
      count: courses.filter((c) => c.subjectIds.includes(subject.id)).length,
    }));
    const sorted = counts.filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
    if (sorted.length <= 6) return sorted;
    const top6 = sorted.slice(0, 6);
    const restCount = sorted.slice(6).reduce((sum, item) => sum + item.count, 0);
    return [...top6, { name: "Khác", count: restCount }];
  }, [courses, subjects]);

  const tuitionData = useMemo(() => {
    if (courses.length === 0) return [];
    const maxFee = Math.max(...courses.map((c) => pricePerSession(c)), 0);
    const bucketCount = Math.max(1, Math.ceil((maxFee + 1) / TUITION_BUCKET_SIZE));
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const min = i * TUITION_BUCKET_SIZE;
      const max = min + TUITION_BUCKET_SIZE;
      return { label: `${min / 1_000}-${max / 1_000}k`, min, max, count: 0 };
    });
    courses.forEach((c) => {
      const fee = pricePerSession(c);
      const bucket = buckets.find((b) => fee >= b.min && fee < b.max);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }, [courses]);

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError) {
    return (
      <ErrorState
        message="Không tải được dữ liệu tổng quan môn học & khóa học."
        onRetry={() => {
          coursesQuery.refetch();
          subjectsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={BookOpen} tone="primary" value={kpi.total} label="Tổng số khóa học" hint="Tất cả trạng thái" />
        <StatCard
          icon={CheckCircle2}
          tone="success"
          value={kpi.active}
          label="Đang mở"
          hint={`${kpi.draft} nháp · ${kpi.completed} đã kết thúc`}
        />
        <StatCard
          icon={GraduationCap}
          tone="info"
          value={kpi.activeSubjectsCount}
          label="Môn học đang dùng"
          hint={`${kpi.archivedSubjects} môn đã lưu trữ`}
        />
        <StatCard
          icon={AlertTriangle}
          tone="warning"
          value={kpi.subjectsWithoutCourse.length}
          label="Môn học chưa có khóa học"
          hint="Cần tạo khóa học cho môn này"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartPanel title="Khóa học theo trạng thái" description={`Tổng ${kpi.total} khóa học`} className="min-h-[300px]">
          {kpi.total === 0 ? (
            <EmptyState title="Chưa có khóa học nào" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" aria-label="Biểu đồ số lượng khóa học theo trạng thái">
                  {ChartGradientDefs()}
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="status" width={90} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`${value} khóa học`, "Số lượng"]} />
                  <Bar dataKey="count" filter={CHART_DEPTH_FILTER} radius={[0, 10, 10, 0]} barSize={18} isAnimationActive={!reducedMotion} animationDuration={280}>
                    {statusData.map((entry, index) => (
                      <Cell key={entry.status} fill={[CHART_GRADIENT.warning, CHART_GRADIENT.success, CHART_GRADIENT.neutral][index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <ChartPanel title="Khóa học theo môn học" description="Đếm theo môn được gắn ở khóa học" className="min-h-[300px]">
          {subjectData.length === 0 ? (
            <EmptyState title="Chưa có môn học nào gắn khóa học" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} layout="vertical" aria-label="Biểu đồ số lượng khóa học theo môn học">
                  {ChartGradientDefs()}
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="name" width={90} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`${value} khóa học`, "Số lượng"]} />
                  <Bar dataKey="count" fill={CHART_GRADIENT.primary} filter={CHART_DEPTH_FILTER} radius={[0, 10, 10, 0]} barSize={18} isAnimationActive={!reducedMotion} animationDuration={280} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <ChartPanel title="Phân bố học phí/buổi" description="Số khóa học theo khoảng học phí mỗi buổi" className="min-h-[300px]">
          {tuitionData.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu học phí" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tuitionData} aria-label="Biểu đồ phân bố học phí mỗi buổi theo khoảng 20 nghìn đồng">
                  {ChartGradientDefs()}
                  <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`${value} khóa học`, "Số lượng"]} />
                  <Bar dataKey="count" fill={CHART_GRADIENT.primary} filter={CHART_DEPTH_FILTER} radius={[10, 10, 3, 3]} barSize={28} isAnimationActive={!reducedMotion} animationDuration={280} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="mb-2 text-base font-semibold text-neutral-900">Cần xử lý</h2>
          <p className="mb-2 text-sm text-neutral-500">Môn học chưa có khóa học</p>
          {kpi.subjectsWithoutCourse.length === 0 ? (
            <EmptyState title="Mọi môn học đều đã có khóa học" />
          ) : (
            <ul className="flex flex-col gap-2">
              {kpi.subjectsWithoutCourse.map((subject) => (
                <li
                  key={subject.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-warning-100 bg-warning-50 px-3 py-2"
                >
                  <span className="text-sm font-semibold text-neutral-900">
                    {subject.name} <span className="font-normal text-neutral-500">({subject.code})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onCreateCourseForSubject(subject.id)}
                    className="min-h-touch rounded-input border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Thêm khóa học
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-xs text-neutral-400">
        Học phí trung bình/buổi: {courses.length > 0 ? formatVnd(Math.round(courses.reduce((s, c) => s + pricePerSession(c), 0) / courses.length)) : "--"}
      </p>
    </div>
  );
}
