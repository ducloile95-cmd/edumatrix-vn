import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SUBMISSION_STATUS_LABEL, SUBMISSION_STATUS_TONE } from "@/features/assignments/constants";
import { getStudent } from "@/services/firestore/students";
import { getClass } from "@/services/firestore/classes";
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

export default function ViewerAssignmentsPage() {
  const { userDoc } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const studentQueries = useQueries({ queries: studentIds.map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })) });
  const students = studentQueries.flatMap((query) => query.data ? [query.data] : []);

  useEffect(() => {
    if (students.length > 0 && !students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [selectedStudentId, students]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const classIds = selectedStudent?.currentClassIds ?? [];
  const classQueries = useQueries({ queries: classIds.map((id) => ({ queryKey: ["class", id], queryFn: () => getClass(id) })) });
  const assignmentQueries = useQueries({ queries: classIds.map((id) => ({ queryKey: ["viewer-assignments", id], queryFn: () => listAssignmentsByClass(id) })) });
  const submissions = useQuery({
    queryKey: ["viewer-submissions", selectedStudentId],
    queryFn: () => listSubmissionsByStudents([selectedStudentId]),
    enabled: !!selectedStudentId,
  });

  const assignments = useMemo(() => {
    const unique = new Map<string, Assignment>();
    assignmentQueries.forEach((query) => query.data?.forEach((assignment) => unique.set(assignment.id, assignment)));
    return [...unique.values()].sort((a, b) => b.dueAt.toMillis() - a.dueAt.toMillis());
  }, [assignmentQueries]);

  const rows = useMemo(() => assignments.map((assignment) => ({
    assignment,
    submission: submissions.data?.find((item) => item.assignmentId === assignment.id),
    className: classQueries.find((query) => query.data?.id === assignment.classId)?.data?.name ?? "Lớp học",
  })), [assignments, classQueries, submissions.data]);

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
    || classQueries.some((query) => query.isLoading)
    || assignmentQueries.some((query) => query.isLoading)
    || submissions.isLoading;
  const firstError = studentQueries.find((query) => query.error)?.error
    ?? classQueries.find((query) => query.error)?.error
    ?? assignmentQueries.find((query) => query.error)?.error
    ?? submissions.error;

  const retry = () => {
    studentQueries.forEach((query) => query.refetch());
    classQueries.forEach((query) => query.refetch());
    assignmentQueries.forEach((query) => query.refetch());
    submissions.refetch();
  };

  return (
    <ViewerShell>
      {isLoading && <LoadingSkeleton rows={5} />}
      {!isLoading && firstError && <ErrorState message="Không thể tải danh sách bài tập. Vui lòng kiểm tra kết nối và thử lại." onRetry={retry} />}
      {!isLoading && !firstError && !selectedStudent && (
        <EmptyState title="Chưa liên kết học sinh" description="Tài khoản phụ huynh cần được liên kết với học sinh để theo dõi bài tập." />
      )}
      {!isLoading && !firstError && selectedStudent && (
        <div className="space-y-4 pb-20 sm:pb-0">
          {students.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Chọn học sinh">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => { setSelectedStudentId(student.id); setFilter("all"); }}
                  aria-pressed={selectedStudent.id === student.id}
                  className={`motion-control min-h-touch shrink-0 rounded-input border px-4 text-sm font-semibold active:scale-[.98] ${selectedStudent.id === student.id ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-primary-300"}`}
                >
                  {student.fullName}
                </button>
              ))}
            </div>
          )}

          <header className="flex items-end justify-between gap-5">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Danh sách bài tập</h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-5 text-neutral-500">Theo dõi tình trạng hoàn thành, điểm và phản hồi của giáo viên. Bài làm được thực hiện theo hướng dẫn ngoài hệ thống.</p>
            </div>
            <span className="hidden shrink-0 rounded-input border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 sm:inline-block">Chỉ theo dõi</span>
          </header>

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
            <div className="space-y-2.5">
              {visibleRows.map((row) => <AssignmentCard key={row.assignment.id} {...row} />)}
            </div>
          )}

          <FilterTabs filter={filter} counts={counts} onChange={setFilter} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-neutral-200 bg-white/95 px-2 pt-2 shadow-[0_-10px_30px_rgba(37,61,124,.1)] backdrop-blur-md [padding-bottom:calc(.5rem+env(safe-area-inset-bottom))] sm:hidden" mobile />
        </div>
      )}
    </ViewerShell>
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
          onClick={() => onChange(value)}
          className={mobile
            ? `motion-control grid min-h-touch place-items-center rounded-input px-1 py-1 text-3xs font-bold ${filter === value ? "bg-primary-50 text-primary-700" : "text-neutral-500"}`
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
  return (
    <article className="grid gap-4 rounded-card border border-neutral-200 bg-white p-4 shadow-[0_4px_18px_rgba(37,61,124,.035)] transition-colors hover:border-primary-200 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-6 lg:p-5">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-3xs font-bold text-primary-700">
          <span className="rounded-input bg-primary-50 px-2 py-1">{className}</span>
          <span>Bài tập được giao</span>
        </div>
        <h3 className="text-base font-bold text-neutral-900">{assignment.title}</h3>
        {assignment.description && <p className="mt-1.5 text-sm leading-5 text-neutral-600">{assignment.description}</p>}
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
