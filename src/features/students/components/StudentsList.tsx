import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSubmissionsByStudents } from "@/services/firestore/assignments";
import { listAttendanceByStudents } from "@/services/firestore/attendance";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listStudentSummariesByIds } from "@/services/firestore/scores";
import { listStudents } from "@/services/firestore/students";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES } from "@/constants/roles";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { CHART_TONE_ACCENT, CHART_TONE_BG } from "@/components/charts/chartTheme";
import { usePagination } from "@/hooks/usePagination";
import { StudentInfoDialog } from "@/features/students/components/StudentInfoDialog";
import { TimeRangeFilter, type DateRange } from "@/features/students/components/TimeRangeFilter";
import type { AttendanceDoc, StudentDoc, SubmissionDoc } from "@/types/academic";

type StatusFilter = "all" | "active" | "inactive";
type GradeLetter = "S" | "A" | "B" | "D";
type MetricValue = number | null;

interface StudentScoreSummary {
  id: string;
  scoreCount: number;
  averagePercent: number;
  latestScore: number;
  latestMaxScore: number;
}

interface CountMetric {
  percent: MetricValue;
  total: number;
}

const PAGE_SIZE_OPTIONS = [15, 20, 30, 50, 100];
const TOTAL_SESSIONS_FALLBACK = 24;
const STUDENT_TABLE_COLUMNS = "180px 96px 170px 170px 280px minmax(360px, 1fr) 88px";
const STUDENT_TABLE_MIN_WIDTH = 1440;

export function StudentsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [pageSize, setPageSize] = useState(15);
  const [viewingStudent, setViewingStudent] = useState<(StudentDoc & { id: string }) | null>(null);
  const { role } = useAuth();

  const { data: students, isLoading, isError, refetch } = useQuery({
    queryKey: ["students"],
    queryFn: listStudents,
  });

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: listClasses,
    staleTime: 60_000,
  });

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
    staleTime: 60_000,
  });

  const classById = useMemo(
    () => new Map((classesQuery.data ?? []).map((item) => [item.id, item])),
    [classesQuery.data],
  );
  const courseById = useMemo(
    () => new Map((coursesQuery.data ?? []).map((item) => [item.id, item])),
    [coursesQuery.data],
  );

  const filtered = useMemo(() => {
    if (!students) return [];
    const keyword = search.trim().toLowerCase();

    return students.filter((student) => {
      const classCourseText = student.currentClassIds
        .map((classId) => {
          const classInfo = classById.get(classId);
          const courseInfo = classInfo?.courseId ? courseById.get(classInfo.courseId) : undefined;
          return [classId, classInfo?.name, classInfo?.courseId, courseInfo?.name].filter(Boolean).join(" ");
        })
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !keyword ||
        student.fullName.toLowerCase().includes(keyword) ||
        student.studentCode.toLowerCase().includes(keyword) ||
        classCourseText.includes(keyword);
      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      const createdAt = student.createdAt?.toDate ? student.createdAt.toDate() : null;
      const matchesDate = !dateRange || (createdAt !== null && createdAt >= dateRange.from && createdAt <= dateRange.to);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [classById, courseById, dateRange, search, statusFilter, students]);

  const { page, pageItems, setPage } = usePagination(filtered, pageSize);
  const visibleStudentIds = useMemo(() => pageItems.map((student) => student.id), [pageItems]);

  const attendanceQuery = useQuery({
    queryKey: ["student-attendance-page", visibleStudentIds],
    queryFn: () => listAttendanceByStudents(visibleStudentIds),
    enabled: visibleStudentIds.length > 0,
    staleTime: 60_000,
  });

  const submissionsQuery = useQuery({
    queryKey: ["student-submissions-page", visibleStudentIds],
    queryFn: () => listSubmissionsByStudents(visibleStudentIds),
    enabled: visibleStudentIds.length > 0,
    staleTime: 60_000,
  });

  const summariesQuery = useQuery({
    queryKey: ["student-score-summaries-page", visibleStudentIds],
    queryFn: () => listStudentSummariesByIds(visibleStudentIds),
    enabled: visibleStudentIds.length > 0,
    staleTime: 60_000,
  });

  const attendanceByStudent = useMemo(
    () => buildAttendanceMetrics(attendanceQuery.data ?? []),
    [attendanceQuery.data],
  );
  const homeworkByStudent = useMemo(
    () => buildHomeworkMetrics(submissionsQuery.data ?? []),
    [submissionsQuery.data],
  );
  const summaryByStudent = useMemo(
    () => new Map((summariesQuery.data ?? []).map((summary) => [summary.id, summary])),
    [summariesQuery.data],
  );

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách học sinh." onRetry={() => refetch()} />;
  if (!students || students.length === 0) {
    return <EmptyState title="Chưa có học sinh nào" description="Thêm học sinh ở form phía trên." />;
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(360px,1fr)_280px_auto] xl:items-end">
        <div>
          <label htmlFor="student-search" className="mb-1 block text-xs font-semibold text-neutral-500">
            Ô tìm kiếm
          </label>
          <SearchInput
            id="student-search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm theo tên, mã học sinh hoặc mã lớp"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-neutral-500">Trạng thái học</p>
          <div className="grid min-h-touch grid-cols-3 gap-1 rounded-input border border-neutral-300 bg-neutral-50 p-1">
            {[
              ["all", "Tất cả"],
              ["active", "Đang học"],
              ["inactive", "Đã nghỉ"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatusFilter(value as StatusFilter);
                  setPage(1);
                }}
                className={`rounded-[7px] px-2 text-xs font-semibold transition ${
                  statusFilter === value
                    ? "bg-primary-500 text-white shadow-[0_4px_12px_rgba(51,102,240,.18)]"
                    : "text-neutral-600 hover:bg-white hover:text-primary-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-neutral-500">Thời gian lọc</p>
          <TimeRangeFilter
            value={dateRange}
            onApply={(range) => {
              setDateRange(range);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataListPanel className="rounded-card border border-neutral-200 bg-white">
        <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
          <h2 className="text-xl font-semibold text-neutral-900">Danh sách học sinh</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Theo dõi lớp học, tiến độ, điểm danh, bài tập và đánh giá trong một bảng.
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 sm:px-5">
            <EmptyState title="Không tìm thấy học sinh phù hợp" />
          </div>
        ) : (
          <>
            <div className={DATA_LIST_SCROLL}>
              <div style={{ minWidth: STUDENT_TABLE_MIN_WIDTH }}>
                <div
                  className="sticky top-0 z-10 grid gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-500"
                  style={{ gridTemplateColumns: STUDENT_TABLE_COLUMNS }}
                >
                  <div>Tên học sinh</div>
                  <div className="text-center">Trạng thái</div>
                  <div className="text-center">Lớp học</div>
                  <div className="text-center">Khóa học</div>
                  <div className="text-center">Tiến độ</div>
                  <div className="rounded-md bg-primary-100 py-1 text-center text-primary-800 ring-1 ring-primary-200">Đánh giá</div>
                  <div className="text-center">Thao tác</div>
                </div>
                <ul className="divide-y divide-neutral-100">
              {pageItems.map((student) => {
                const primaryClassId = student.currentClassIds[0] ?? "";
                const primaryClass = primaryClassId ? classById.get(primaryClassId) : undefined;
                const primaryCourse = primaryClass?.courseId ? courseById.get(primaryClass.courseId) : undefined;
                const attendance = attendanceByStudent.get(student.id) ?? { percent: null, total: 0 };
                const homework = homeworkByStudent.get(student.id) ?? { percent: null, total: 0 };
                const summary = summaryByStudent.get(student.id);
                const assessmentPercent = getAssessmentPercent(summary);
                const grade = assessmentPercent === null ? null : getGradeLetter(assessmentPercent);
                const progress = getLearningProgress(student, attendance, primaryCourse?.totalSessions);

                return (
                  <li key={student.id} className="px-4 py-3 transition hover:bg-neutral-50">
                    <div className="grid gap-3 xl:items-center" style={{ gridTemplateColumns: STUDENT_TABLE_COLUMNS }}>
                      <div>
                        <p className="text-2xs font-semibold text-neutral-900">{student.fullName}</p>
                        <p className="mt-0.5 font-mono text-2xs text-neutral-500">{student.studentCode}</p>
                      </div>

                      <div className="flex justify-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-2xs font-semibold ${student.status === "active" ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-600"}`}>
                          {student.status === "active" ? "Đang học" : "Đã nghỉ"}
                        </span>
                      </div>

                      <div>
                        <p className="font-mono text-2xs font-semibold text-neutral-900">{primaryClassId || "--"}</p>
                        <p className="mt-0.5 text-2xs text-neutral-500">
                          {primaryClass?.name ?? "Chưa có lớp"}
                        </p>
                      </div>

                      <div>
                        <p className="text-2xs font-semibold text-neutral-900">{primaryCourse?.name ?? "Chưa có khóa"}</p>
                        <p className="mt-0.5 font-mono text-2xs text-neutral-500">
                          {primaryClass?.courseId ?? "--"}
                        </p>
                      </div>

                      <ProgressCell progress={progress} />

                      <div className="grid min-w-0 grid-cols-1 gap-2 rounded-input bg-primary-50 p-2 ring-1 ring-primary-200 sm:grid-cols-3 xl:grid-cols-3">
                        <ScoreRing label="Điểm danh" value={attendance.percent} total={attendance.total} />
                        <ScoreRing label="Bài tập" value={homework.percent} total={homework.total} />
                        <ScoreRing label="Đánh giá" value={assessmentPercent} total={summary?.scoreCount ?? 0} grade={grade} />
                      </div>

                      <div className="flex justify-start xl:justify-end">
                        <button
                          type="button"
                          onClick={() => setViewingStudent(student)}
                          className="min-h-touch rounded-input border border-neutral-300 bg-white px-3 text-2xs font-semibold text-neutral-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-[.98]"
                        >
                          Thông tin
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
                </ul>
              </div>
            </div>
            <div className={DATA_LIST_FOOTER}>
              <Pagination
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                totalItems={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                }}
              />
            </div>
          </>
        )}
      </DataListPanel>

      <StudentInfoDialog
        canManageLinks={role === USER_ROLES.ADMIN}
        open={!!viewingStudent}
        student={viewingStudent}
        onClose={() => setViewingStudent(null)}
      />
    </div>
  );
}

function buildAttendanceMetrics(items: (AttendanceDoc & { id: string })[]): Map<string, CountMetric> {
  const map = new Map<string, { counted: number; total: number }>();
  items.forEach((item) => {
    const current = map.get(item.studentId) ?? { counted: 0, total: 0 };
    const counted = item.status === "present" || item.status === "late" || item.status === "excused";
    map.set(item.studentId, { counted: current.counted + Number(counted), total: current.total + 1 });
  });
  return toPercentMap(map);
}

function buildHomeworkMetrics(items: (SubmissionDoc & { id: string })[]): Map<string, CountMetric> {
  const map = new Map<string, { counted: number; total: number }>();
  items.forEach((item) => {
    const current = map.get(item.studentId) ?? { counted: 0, total: 0 };
    const counted = item.status === "submitted" || item.status === "reviewing" || item.status === "graded";
    map.set(item.studentId, { counted: current.counted + Number(counted), total: current.total + 1 });
  });
  return toPercentMap(map);
}

function toPercentMap(source: Map<string, { counted: number; total: number }>): Map<string, CountMetric> {
  return new Map(
    [...source.entries()].map(([studentId, value]) => [
      studentId,
      { percent: value.total ? Math.round((value.counted / value.total) * 100) : null, total: value.total },
    ]),
  );
}

function getAssessmentPercent(summary?: StudentScoreSummary): MetricValue {
  if (!summary || summary.scoreCount === 0) return null;
  return Math.round(summary.averagePercent);
}

function getGradeLetter(percent: number): GradeLetter {
  if (percent >= 95) return "S";
  if (percent >= 85) return "A";
  if (percent >= 70) return "B";
  return "D";
}

function getLearningProgress(student: StudentDoc, attendance: CountMetric, totalSessions = TOTAL_SESSIONS_FALLBACK) {
  const plannedSessions = Math.max(1, totalSessions);
  const completed = attendance.total;
  const remaining = Math.max(0, plannedSessions - completed);
  const percent = Math.min(100, Math.round((completed / plannedSessions) * 100));
  return {
    completed,
    percent,
    remaining,
    startDate: formatDateOnly(student.createdAt),
    tone: percent >= 70 ? "success" : percent >= 40 ? "warning" : "danger",
  };
}

function ProgressCell({ progress }: { progress: ReturnType<typeof getLearningProgress> }) {
  const fillClass =
    progress.tone === "success" ? "bg-success-500" : progress.tone === "warning" ? "bg-warning-500" : "bg-danger-500";
  const textClass =
    progress.tone === "success" ? "text-success-700" : progress.tone === "warning" ? "text-warning-700" : "text-danger-700";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-2xs font-semibold text-neutral-500">Ngày bắt đầu</span>
        <span className="text-2xs font-semibold text-neutral-900">{progress.startDate}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full transition-all duration-500 ${fillClass}`} style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`text-2xs font-semibold ${textClass}`}>{progress.percent}%</span>
        <span className="text-2xs text-neutral-500">{progress.remaining} buổi còn lại</span>
      </div>
    </div>
  );
}

function ScoreRing({
  grade,
  label,
  total,
  value,
}: {
  grade?: GradeLetter | null;
  label: string;
  total: number;
  value: MetricValue;
}) {
  const tone = getMetricTone(value, grade);
  const textClassByTone = {
    success: "text-success-700",
    primary: "text-primary-700",
    warning: "text-warning-700",
    danger: "text-danger-700",
    neutral: "text-neutral-500",
  } as const;
  const palette = {
    accent: CHART_TONE_ACCENT[tone],
    bg: CHART_TONE_BG[tone],
    text: textClassByTone[tone],
  };

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-input border border-neutral-200 bg-white px-2 py-1.5">
      <div
        className="grid size-9 shrink-0 place-items-center rounded-full transition"
        style={{
          background: `conic-gradient(${palette.accent} ${value ?? 0}%, ${palette.bg} 0)`,
        }}
      >
        <div className="grid size-6 place-items-center rounded-full bg-white">
          <span className={`text-2xs font-bold ${palette.text}`}>{grade ?? (value === null ? "--" : value)}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xs font-semibold leading-4 text-neutral-700">{label}</p>
        <p className="truncate text-2xs leading-3 text-neutral-500">{total ? `${total} lần` : "Chưa có"}</p>
      </div>
    </div>
  );
}

function getMetricTone(value: MetricValue, grade?: GradeLetter | null): "success" | "primary" | "warning" | "danger" | "neutral" {
  if (grade === "S") return "success";
  if (grade === "A") return "primary";
  if (grade === "B") return "warning";
  if (grade === "D") return "danger";
  if (value === null) return "neutral";
  if (value >= 85) return "success";
  if (value >= 70) return "primary";
  if (value >= 50) return "warning";
  return "danger";
}

function formatDateOnly(value: StudentDoc["createdAt"]): string {
  return value?.toDate ? value.toDate().toLocaleDateString("vi-VN") : "--";
}
