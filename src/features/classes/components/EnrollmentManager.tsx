import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudents } from "@/services/firestore/students";
import { enrollStudent, unenrollStudent } from "@/services/firestore/enrollments";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";

interface EnrollmentManagerProps {
  classId: string;
  courseId: string;
  enrolledStudentIds: string[];
}

/**
 * Ghi danh/rut hoc sinh khoi lop. Dung so luong hoc sinh nho (<50 theo quy
 * mo du an) nen tai toan bo danh sach hoc sinh roi loc o client (A14).
 */
export function EnrollmentManager({ classId, courseId, enrolledStudentIds }: EnrollmentManagerProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const queryClient = useQueryClient();

  const {
    data: students,
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ["students"], queryFn: listStudents });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["class", classId] });
  };

  const enrollMutation = useMutation({
    mutationFn: (studentId: string) => enrollStudent(classId, courseId, studentId),
    onSuccess: () => {
      setSelectedStudentId("");
      invalidate();
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: (studentId: string) => unenrollStudent(classId, studentId),
    onSuccess: invalidate,
  });

  if (isLoading) return <LoadingSkeleton rows={2} />;
  if (isError) {
    return <ErrorState message="Không tải được danh sách học sinh." onRetry={() => refetch()} />;
  }

  const enrolledStudents = (students ?? []).filter((s) => enrolledStudentIds.includes(s.id));
  const availableStudents = (students ?? []).filter(
    (s) => s.status === "active" && !enrolledStudentIds.includes(s.id),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="enroll-student" className="mb-1 block text-sm font-medium text-neutral-700">
            Thêm học sinh vào lớp
          </label>
          <select
            id="enroll-student"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
          >
            <option value="">-- Chọn học sinh --</option>
            {availableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.studentCode})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!selectedStudentId || enrollMutation.isPending}
          onClick={() => enrollMutation.mutate(selectedStudentId)}
          className="min-h-touch rounded-input bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-40"
        >
          {enrollMutation.isPending ? "Đang ghi danh..." : "Ghi danh"}
        </button>
      </div>

      <p className="section-label mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Học sinh trong lớp ({enrolledStudents.length})
      </p>
      {enrolledStudents.length === 0 ? (
        <EmptyState title="Chưa có học sinh nào trong lớp" />
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100">
          {enrolledStudents.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm text-neutral-800">
                {s.fullName} <span className="text-neutral-400">({s.studentCode})</span>
              </span>
              <button
                type="button"
                onClick={() => unenrollMutation.mutate(s.id)}
                disabled={unenrollMutation.isPending}
                className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                Rút khỏi lớp
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
