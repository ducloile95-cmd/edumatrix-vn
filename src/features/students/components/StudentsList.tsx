import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSubmissionsByStudents } from "@/services/firestore/assignments";
import { listAttendanceByStudents } from "@/services/firestore/attendance";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listStudentSummariesByIds } from "@/services/firestore/scores";
import { listStudents } from "@/services/firestore/students";
import { studentLabel } from "@/utils/student";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES } from "@/constants/roles";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterField, FilterSelect, FilterToolbar } from "@/components/ui/FilterToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import { StudentInfoDialog } from "@/features/students/components/StudentInfoDialog";
import { TimeRangeFilter, type DateRange } from "@/features/students/components/TimeRangeFilter";
import {
  buildAttendanceMetrics,
  buildHomeworkMetrics,
  getAssessmentPercent,
  getGradeLetter,
  getLearningProgress,
} from "@/features/students/components/studentListMetrics";
import {
  ProgressCell,
  ScoreRing,
} from "@/features/students/components/StudentListMetricCells";
import type { StudentDoc } from "@/types/academic";

type StatusFilter = "all" | "active" | "inactive";
const PAGE_SIZE_OPTIONS = [15, 20, 30, 50, 100];
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
        studentLabel(student).toLowerCase().includes(keyword) ||
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
  const studentRows = pageItems.map((student) => {
    const primaryClassId = student.currentClassIds[0] ?? "";
    const primaryClass = primaryClassId ? classById.get(primaryClassId) : undefined;
    const primaryCourse = primaryClass?.courseId ? courseById.get(primaryClass.courseId) : undefined;
    const attendance = attendanceByStudent.get(student.id) ?? { percent: null, total: 0 };
    const homework = homeworkByStudent.get(student.id) ?? { percent: null, total: 0 };
    const summary = summaryByStudent.get(student.id);
    const assessmentPercent = getAssessmentPercent(summary);

    return {
      assessmentPercent,
      attendance,
      grade: assessmentPercent === null ? null : getGradeLetter(assessmentPercent),
      homework,
      primaryClass,
      primaryClassId,
      primaryCourse,
      progress: getLearningProgress(student, attendance, primaryCourse?.totalSessions),
      student,
      summary,
    };
  });

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách học sinh." onRetry={() => refetch()} />;
  if (!students || students.length === 0) {
    return <EmptyState title="Chưa có học sinh nào" description="Thêm học sinh ở form phía trên." />;
  }

  return (
    <div>
      <FilterToolbar label="Tìm kiếm và lọc học sinh" className="[&>div]:xl:grid-cols-[minmax(360px,1fr)_240px_auto]">
        <FilterField label="Tìm kiếm" htmlFor="student-search">
          <SearchInput
            id="student-search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm theo tên, mã học sinh hoặc mã lớp"
          />
        </FilterField>

        <FilterSelect
          id="student-status-filter"
          label="Trạng thái học"
          value={statusFilter}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "active", label: "Đang học" },
            { value: "inactive", label: "Đã nghỉ" },
          ]}
          onChange={(value) => {
            setStatusFilter(value as StatusFilter);
            setPage(1);
          }}
        />

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
      </FilterToolbar>

      <DataListPanel className="rounded-card border border-neutral-200 bg-white">
        <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
          <h2 className="text-xl font-semibold text-neutral-900">Danh sách học sinh</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 sm:px-5">
            <EmptyState title="Không tìm thấy học sinh phù hợp" />
          </div>
        ) : (
          <>
            <ul
              aria-label="Danh sách học sinh trên di động"
              className={`${DATA_LIST_SCROLL} grid content-start gap-3 bg-neutral-50 p-3 md:hidden`}
            >
              {studentRows.map(({
                assessmentPercent,
                attendance,
                grade,
                homework,
                primaryClass,
                primaryClassId,
                primaryCourse,
                progress,
                student,
                summary,
              }) => (
                <li key={student.id}>
                  <article className="rounded-card border border-neutral-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-neutral-900">
                          {studentLabel(student)}
                        </h3>
                        <p className="mt-1 font-mono text-xs text-neutral-500">{student.studentCode}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${student.status === "active" ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-600"}`}>
                        {student.status === "active" ? "Đang học" : "Đã nghỉ"}
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-3 border-y border-neutral-100 py-3">
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-neutral-500">Lớp học</dt>
                        <dd className="mt-1 truncate text-xs font-semibold text-neutral-900">
                          {primaryClass?.name ?? "Chưa có lớp"}
                        </dd>
                        <dd className="mt-0.5 truncate font-mono text-2xs text-neutral-500">
                          {primaryClassId || "--"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-neutral-500">Khóa học</dt>
                        <dd className="mt-1 truncate text-xs font-semibold text-neutral-900">
                          {primaryCourse?.name ?? "Chưa có khóa"}
                        </dd>
                        <dd className="mt-0.5 truncate font-mono text-2xs text-neutral-500">
                          {primaryClass?.courseId ?? "--"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 rounded-input bg-neutral-50 p-3 ring-1 ring-neutral-200">
                      <ProgressCell progress={progress} />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 rounded-input bg-primary-50 p-2 ring-1 ring-primary-200 min-[380px]:grid-cols-3">
                      <ScoreRing label="Điểm danh" value={attendance.percent} total={attendance.total} />
                      <ScoreRing label="Bài tập" value={homework.percent} total={homework.total} />
                      <ScoreRing label="Đánh giá" value={assessmentPercent} total={summary?.scoreCount ?? 0} grade={grade} />
                    </div>

                    <button
                      type="button"
                      aria-label={`Xem thông tin ${studentLabel(student)}`}
                      onClick={() => setViewingStudent(student)}
                      className="mt-3 min-h-touch w-full rounded-input border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100 active:scale-[.99]"
                    >
                      Xem thông tin
                    </button>
                  </article>
                </li>
              ))}
            </ul>

            <div
              aria-label="Bảng học sinh trên máy tính"
              className={`${DATA_LIST_SCROLL} hidden md:block`}
              role="region"
            >
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
              {studentRows.map(({
                assessmentPercent,
                attendance,
                grade,
                homework,
                primaryClass,
                primaryClassId,
                primaryCourse,
                progress,
                student,
                summary,
              }) => (
                  <li key={student.id} className="px-4 py-3 transition hover:bg-neutral-50">
                    <div className="grid gap-3 xl:items-center" style={{ gridTemplateColumns: STUDENT_TABLE_COLUMNS }}>
                      <div>
                        <p className="text-2xs font-semibold text-neutral-900">{studentLabel(student)}</p>
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
              ))}
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
