import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SUBMISSION_STATUS_LABEL, SUBMISSION_STATUS_TONE } from "@/features/assignments/constants";
import { ViewerStudentSwitcher } from "@/features/students/components/ViewerStudentSwitcher";
import { useViewerStudentSelection } from "@/features/students/hooks/useViewerStudentSelection";
import { getStudent } from "@/services/firestore/students";
import { listAccessibleClassesByIds } from "@/services/firestore/classes";
import { listAssignmentsByClass, listSubmissionsByStudents } from "@/services/firestore/assignments";
import type { AssignmentDoc, SubmissionDoc } from "@/types/academic";

type Filter = "all" | "todo" | "submitted" | "graded";
type Assignment = AssignmentDoc & { id: string };
type Submission = SubmissionDoc & { id: string };

const FILTER_LABEL: Record<Filter, string> = {
  all: "Tất cả",
  todo: "Cần hoàn thành",
  submitted: "Đã nộp",
  graded: "Đã chấm",
};

function assignmentFilter(submission?: Submission): Exclude<Filter, "all"> {
  if (!submission || submission.status === "redo_required") return "todo";
  return submission.status === "graded" ? "graded" : "submitted";
}

const ASSIGNMENT_PRIORITY: Record<Exclude<Filter, "all">, number> = {
  todo: 0,
  submitted: 1,
  graded: 2,
};

export default function ViewerAssignmentsPage() {
  const { userDoc } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const studentQueries = useQueries({ queries: studentIds.map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })) });
  const students = studentQueries.flatMap((query) => query.data ? [query.data] : []);
  const { selectedStudentId, selectStudent } = useViewerStudentSelection(students);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const activeStudentId = selectedStudent?.id ?? "";
  const classIds = selectedStudent?.currentClassIds ?? [];
  const classes = useQuery({
    queryKey: ["viewer-classes", classIds],
    queryFn: () => listAccessibleClassesByIds(classIds),
    enabled: !!selectedStudent,
  });
  const accessibleClasses = useMemo(() => classes.data ?? [], [classes.data]);
  const accessibleClassIds = accessibleClasses.map((klass) => klass.id);
  const assignmentQueries = useQueries({ queries: accessibleClassIds.map((id) => ({ queryKey: ["viewer-assignments", id], queryFn: () => listAssignmentsByClass(id) })) });
  const submissions = useQuery({
    queryKey: ["viewer-submissions", activeStudentId],
    queryFn: () => listSubmissionsByStudents([activeStudentId]),
    enabled: !!activeStudentId,
  });

  const assignments = useMemo(() => {
    const unique = new Map<string, Assignment>();
    assignmentQueries.forEach((query) => query.data?.forEach((assignment) => unique.set(assignment.id, assignment)));
    return [...unique.values()].sort((a, b) => b.dueAt.toMillis() - a.dueAt.toMillis());
  }, [assignmentQueries]);

  const rows = useMemo(() => assignments.map((assignment) => ({
    assignment,
    submission: submissions.data?.find((item) => item.assignmentId === assignment.id),
    className: accessibleClasses.find((klass) => klass.id === assignment.classId)?.name ?? "Lớp học",
  })).sort((left, right) => {
    const leftState = assignmentFilter(left.submission);
    const rightState = assignmentFilter(right.submission);
    const priorityDifference = ASSIGNMENT_PRIORITY[leftState] - ASSIGNMENT_PRIORITY[rightState];
    if (priorityDifference !== 0) return priorityDifference;
    const dueDifference = left.assignment.dueAt.toMillis() - right.assignment.dueAt.toMillis();
    return leftState === "todo" ? dueDifference : -dueDifference;
  }), [accessibleClasses, assignments, submissions.data]);

  const counts = useMemo(() => ({
    all: rows.length,
    todo: rows.filter((row) => assignmentFilter(row.submission) === "todo").length,
    submitted: rows.filter((row) => assignmentFilter(row.submission) === "submitted").length,
    graded: rows.filter((row) => assignmentFilter(row.submission) === "graded").length,
  }), [rows]);
  const gradedRows = rows.filter((row) => row.submission?.status === "graded" && row.submission.score != null);
  const averagePercent = gradedRows.length > 0
    ? Math.round(gradedRows.reduce((sum, row) => sum + ((row.submission?.score ?? 0) / row.assignment.maxScore) * 100, 0) / gradedRows.length)
    : null;
  const visibleRows = filter === "all" ? rows : rows.filter((row) => assignmentFilter(row.submission) === filter);

  const isLoading = studentQueries.some((query) => query.isLoading)
    || classes.isLoading
    || assignmentQueries.some((query) => query.isLoading)
    || submissions.isLoading;
  const firstError = studentQueries.find((query) => query.error)?.error
    ?? classes.error
    ?? assignmentQueries.find((query) => query.error)?.error
    ?? submissions.error;

  const retry = () => {
    studentQueries.forEach((query) => query.refetch());
    classes.refetch();
    assignmentQueries.forEach((query) => query.refetch());
    submissions.refetch();
  };

  return (
    <>
      {isLoading && <LoadingSkeleton rows={5} />}
      {!isLoading && firstError && <ErrorState message="Không thể tải danh sách bài tập. Vui lòng kiểm tra kết nối và thử lại." onRetry={retry} />}
      {!isLoading && !firstError && !selectedStudent && (
        <EmptyState title="Chưa liên kết học sinh" description="Tài khoản phụ huynh cần được liên kết với học sinh để theo dõi bài tập." />
      )}
      {!isLoading && !firstError && selectedStudent && (
        <div className="space-y-4 pb-36 sm:pb-0">
          <ViewerStudentSwitcher
            students={students}
            selectedStudentId={selectedStudent.id}
            onSelect={(studentId) => {
              selectStudent(studentId);
              setFilter("all");
            }}
          />

          <header className="flex items-end justify-between gap-5">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Danh sách bài tập</h2>
              <p className="mt-1.5 text-sm text-neutral-500">Theo dõi bài tập, điểm và phản hồi.</p>
            </div>
            <span className="hidden shrink-0 rounded-input border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 sm:inline-block">Chỉ theo dõi</span>
          </header>

          {accessibleClasses.length === 0 ? (
            <EmptyState title="Chưa được phân lớp" description="Hồ sơ học sinh vẫn được lưu. Bài tập sẽ hiển thị sau khi học sinh được phân vào lớp." />
          ) : (
            <>
              <section className="grid grid-cols-2 overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)] lg:grid-cols-4" aria-label="Tổng quan bài tập">
            <SummaryCell label="Tổng bài được giao" value={counts.all} hint="Trong kỳ học hiện tại" />
            <SummaryCell label="Cần hoàn thành" value={counts.todo} hint={counts.todo > 0 ? "Cần phụ huynh theo dõi" : "Không có bài tồn"} />
            <SummaryCell label="Đã nộp" value={counts.submitted} hint="Đang chờ đánh giá" />
            <SummaryCell label="Đã chấm" value={counts.graded} hint={averagePercent == null ? "Chưa có điểm" : `Điểm trung bình ${averagePercent}%`} />
          </section>

          <FilterTabs filter={filter} counts={counts} onChange={setFilter} className="hidden sm:flex" />

          {rows.length === 0 ? (
            <EmptyState title="Chưa có bài tập nào" description="Khi giáo viên giao bài mới, thông tin sẽ hiển thị ở đây." />
          ) : visibleRows.length === 0 ? (
            <div className="rounded-card border border-dashed border-neutral-300 bg-white px-5 py-12 text-center text-sm text-neutral-500">Không có bài tập trong trạng thái này.</div>
          ) : (
            <section aria-label="Danh sách bài tập" className="space-y-2.5">
              {visibleRows.map((row) => <AssignmentCard key={row.assignment.id} {...row} />)}
            </section>
          )}

              <FilterTabs filter={filter} counts={counts} onChange={setFilter} className="fixed inset-x-0 z-30 grid grid-cols-4 border-t border-neutral-200 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(37,61,124,.1)] backdrop-blur-md [bottom:calc(60px+env(safe-area-inset-bottom))] sm:hidden" mobile />
            </>
          )}
        </div>
      )}
    </>
  );
}

function SummaryCell({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <article className="border-neutral-200 p-4 odd:border-r lg:border-r lg:last:border-r-0">
      <span className="block text-xs text-neutral-500">{label}</span>
      <strong className="mt-1.5 block text-2xl font-extrabold tabular-nums text-neutral-900">{String(value).padStart(2, "0")}</strong>
      <small className="mt-1.5 block text-2xs text-neutral-500">{hint}</small>
    </article>
  );
}

function FilterTabs({ filter, counts, onChange, className, mobile = false }: { filter: Filter; counts: Record<Filter, number>; onChange: (filter: Filter) => void; className: string; mobile?: boolean }) {
  return (
    <div className={className} role="tablist" aria-label="Lọc bài tập">
      {(Object.keys(FILTER_LABEL) as Filter[]).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={filter === value}
          aria-label={mobile ? (value === "todo" ? "Cần làm" : FILTER_LABEL[value]) : undefined}
          onClick={() => onChange(value)}
          className={mobile
            ? `motion-control grid min-h-touch place-items-center rounded-input px-1 py-1 text-xs font-bold ${filter === value ? "bg-primary-50 text-primary-700" : "text-neutral-500"}`
            : `motion-control min-h-9 rounded-input px-3 text-xs font-bold ${filter === value ? "bg-primary-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
        >
          {mobile && <b className="block text-sm leading-4 tabular-nums">{counts[value]}</b>}
          <span>{mobile && value === "todo" ? "Cần làm" : FILTER_LABEL[value]}{!mobile && ` ${counts[value]}`}</span>
        </button>
      ))}
    </div>
  );
}

function AssignmentCard({ assignment, submission, className }: { assignment: Assignment; submission?: Submission; className: string }) {
  const state = assignmentFilter(submission);
  const due = getDueMeta(assignment.dueAt.toDate(), state);
  return (
    <article className="grid gap-4 rounded-card border border-neutral-200 bg-white p-4 shadow-[0_4px_18px_rgba(37,61,124,.035)] transition-colors hover:border-primary-200 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-6 lg:p-5">
      <div className="min-w-0">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-primary-700">
            <span className="rounded-input bg-primary-50 px-2 py-1">{className}</span>
            <span className={`rounded-input px-2 py-1 ${due.className}`}>{due.label}</span>
          </div>
          <div className="shrink-0 lg:hidden">
            {submission ? <StatusBadge tone={SUBMISSION_STATUS_TONE[submission.status]}>{SUBMISSION_STATUS_LABEL[submission.status]}</StatusBadge> : <StatusBadge tone="warning">Cần hoàn thành</StatusBadge>}
          </div>
        </div>
        <h3 className="text-base font-bold text-neutral-900">{assignment.title}</h3>
        {assignment.description && (
          <>
            <p className="mt-1.5 hidden text-sm leading-5 text-neutral-600 sm:block">{assignment.description}</p>
            <details className="group mt-2 sm:hidden">
              <summary className="motion-control flex min-h-touch cursor-pointer list-none items-center text-sm font-semibold text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden">
                Xem hướng dẫn
              </summary>
              <p className="pb-1 text-sm leading-5 text-neutral-600">{assignment.description}</p>
            </details>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-2xs text-neutral-500">
          <span>Giao bởi <b className="text-neutral-700">Giáo viên/Admin phụ trách</b></span>
          <span>Hạn hoàn thành <b className="tabular-nums text-neutral-700">{format(assignment.dueAt.toDate(), "dd/MM · HH:mm")}</b></span>
        </div>
      </div>
      <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3 border-t border-neutral-200 pt-4 lg:grid-cols-[88px_minmax(0,1fr)] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <div className="grid min-h-[68px] place-items-center rounded-card bg-neutral-50 text-center">
          <div>
            <strong className={`block font-extrabold tabular-nums ${submission?.score != null ? "text-xl text-primary-700" : "text-lg text-neutral-500"}`}>{submission?.score != null ? `${submission.score}/${assignment.maxScore}` : state === "submitted" ? "..." : "--"}</strong>
            <span className="mt-1 block text-3xs text-neutral-500">{submission?.score != null ? "Điểm công bố" : state === "submitted" ? "Chờ chấm" : "Chưa có điểm"}</span>
          </div>
        </div>
        <div className="min-w-0">
          {submission ? <StatusBadge tone={SUBMISSION_STATUS_TONE[submission.status]}>{SUBMISSION_STATUS_LABEL[submission.status]}</StatusBadge> : <StatusBadge tone="warning">Cần hoàn thành</StatusBadge>}
          <p className="mt-2 text-2xs text-neutral-500">{submission?.checkedBy ? "Đánh giá bởi Giáo viên/Admin phụ trách" : state === "submitted" ? "Đang chờ giáo viên đánh giá" : "Chưa có đánh giá"}</p>
          <p className="mt-1.5 line-clamp-3 text-xs leading-4 text-neutral-700">{submission?.teacherComment || (state === "submitted" ? "Hệ thống sẽ cập nhật khi kết quả được công bố." : "Bài làm được hoàn thành theo hướng dẫn của giáo viên.")}</p>
        </div>
      </div>
    </article>
  );
}

function getDueMeta(dueAt: Date, state: Exclude<Filter, "all">) {
  if (state !== "todo") {
    return {
      className: "bg-neutral-100 text-neutral-600",
      label: `Hạn ${format(dueAt, "dd/MM")}`,
    };
  }

  const days = differenceInCalendarDays(dueAt, new Date());
  if (days < 0) return { className: "bg-danger-50 text-danger-700", label: "Đã quá hạn" };
  if (days === 0) return { className: "bg-danger-50 text-danger-700", label: "Hạn hôm nay" };
  if (days <= 2) return { className: "bg-warning-50 text-warning-700", label: "Sắp đến hạn" };
  return { className: "bg-primary-50 text-primary-700", label: `Còn ${days} ngày` };
}
