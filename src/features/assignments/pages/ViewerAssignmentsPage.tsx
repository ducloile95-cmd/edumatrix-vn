import { useState } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getStudent } from "@/services/firestore/students";
import { listAssignmentsByClass, listSubmissionsByStudents, submitAssignment } from "@/services/firestore/assignments";
import type { AssignmentDoc } from "@/types/academic";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SUBMISSION_STATUS_LABEL, SUBMISSION_STATUS_TONE } from "@/features/assignments/constants";

export default function ViewerAssignmentsPage() {
  const { userDoc } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];
  const studentQueries = useQueries({ queries: studentIds.map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })) });
  const classIds = [...new Set(studentQueries.flatMap((item) => item.data?.currentClassIds ?? []))];
  const assignmentQueries = useQueries({ queries: classIds.map((id) => ({ queryKey: ["viewer-assignments", id], queryFn: () => listAssignmentsByClass(id) })) });
  const assignments = assignmentQueries.flatMap((item) => item.data ?? []);
  const submissions = useQuery({ queryKey: ["viewer-submissions", studentIds], queryFn: () => listSubmissionsByStudents(studentIds), enabled: studentIds.length > 0 });

  const isLoading = studentQueries.some((query) => query.isLoading) || assignmentQueries.some((query) => query.isLoading);
  const firstError = studentQueries.find((query) => query.error)?.error ?? assignmentQueries.find((query) => query.error)?.error;

  return (
    <ViewerShell>
      {isLoading && <LoadingSkeleton rows={3} />}
      {!isLoading && firstError && (
        <ErrorState
          message="Không thể tải danh sách bài tập. Vui lòng kiểm tra kết nối và thử lại."
          onRetry={() => {
            studentQueries.forEach((query) => query.refetch());
            assignmentQueries.forEach((query) => query.refetch());
          }}
        />
      )}
      {!isLoading && !firstError && assignments.length === 0 && (
        <EmptyState title="Chưa có bài tập nào" description="Khi giáo viên giao bài mới, thông tin sẽ hiển thị ở đây." />
      )}
      {!isLoading && !firstError && assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map((item) => (
            <ViewerAssignment
              key={item.id}
              assignment={item}
              studentId={studentIds.find((id) => studentQueries.find((query) => query.data?.id === id)?.data?.currentClassIds.includes(item.classId)) ?? studentIds[0]}
              saved={submissions.data?.find((value) => value.assignmentId === item.id)}
            />
          ))}
        </div>
      )}
    </ViewerShell>
  );
}

function ViewerAssignment({
  assignment,
  studentId,
  saved,
}: {
  assignment: AssignmentDoc & { id: string };
  studentId: string;
  saved?: Awaited<ReturnType<typeof listSubmissionsByStudents>>[number];
}) {
  const [text, setText] = useState(saved?.submissionText ?? "");
  const [url, setUrl] = useState(saved?.submissionUrl ?? "");
  const mutation = useMutation({ mutationFn: () => submitAssignment(assignment, studentId, { submissionText: text, submissionUrl: url, studentNote: "" }) });

  return (
    <article className="border-b border-neutral-200 py-4">
      <h2>{assignment.title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{assignment.description}</p>
      <textarea
        aria-label="Nội dung bài làm"
        placeholder="Nội dung bài làm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-3 min-h-24 w-full rounded-input border p-3 text-sm"
      />
      <input
        aria-label="Hoặc link bài làm"
        placeholder="Hoặc link bài làm"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="mt-2 min-h-touch w-full rounded-input border px-3 text-sm"
      />
      <button onClick={() => mutation.mutate()} className="mt-2 min-h-touch rounded-input bg-primary-500 px-4 text-sm text-white">
        Nộp bài
      </button>
      {saved && (
        <p className="mt-2 text-xs text-neutral-500">
          <StatusBadge tone={SUBMISSION_STATUS_TONE[saved.status]}>{SUBMISSION_STATUS_LABEL[saved.status]}</StatusBadge>
          {saved.score != null ? ` ${saved.score}/${assignment.maxScore}` : ""} {saved.teacherComment}
        </p>
      )}
    </article>
  );
}
