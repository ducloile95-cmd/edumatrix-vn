import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudents } from "@/services/firestore/students";
import { enrollStudent, unenrollStudent } from "@/services/firestore/enrollments";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { StudentDoc } from "@/types/academic";

interface EnrollmentManagerProps {
  classId: string;
  courseId: string;
  enrolledStudentIds: string[];
}

function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  if (words.length === 0) return "?";
  return ((words[0]?.[0] ?? "") + (words[words.length - 1]?.[0] ?? "")).toUpperCase();
}

/**
 * Ghi danh/rut hoc sinh khoi lop. Dung so luong hoc sinh nho (<50 theo quy
 * mo du an) nen tai toan bo danh sach hoc sinh roi loc o client (A14).
 */
export function EnrollmentManager({ classId, courseId, enrolledStudentIds }: EnrollmentManagerProps) {
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<(StudentDoc & { id: string }) | null>(null);
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
    onSuccess: invalidate,
  });

  const unenrollMutation = useMutation({
    mutationFn: (studentId: string) => unenrollStudent(classId, studentId),
    onSuccess: () => {
      setConfirmTarget(null);
      invalidate();
    },
  });

  if (isLoading) return <LoadingSkeleton rows={2} />;
  if (isError) {
    return <ErrorState message="Không tải được danh sách học sinh." onRetry={() => refetch()} />;
  }

  const enrolledStudents = (students ?? []).filter((s) => enrolledStudentIds.includes(s.id));
  const keyword = search.trim().toLowerCase();
  const availableStudents = (students ?? []).filter(
    (s) =>
      s.status === "active" &&
      !enrolledStudentIds.includes(s.id) &&
      (!keyword || s.fullName.toLowerCase().includes(keyword) || s.studentCode.toLowerCase().includes(keyword)),
  );

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="enroll-search" className="mb-1 block text-sm font-medium text-neutral-700">
            Thêm học sinh vào lớp
          </label>
          <SearchInput id="enroll-search" value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã học sinh" />
          <div className="mt-2 max-h-72 overflow-y-auto rounded-card border border-neutral-200">
            {availableStudents.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={keyword ? "Không tìm thấy học sinh phù hợp" : "Không còn học sinh nào để thêm"}
                />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {availableStudents.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="grid size-8 flex-none place-items-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                      {initials(s.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">{s.fullName}</p>
                      <p className="font-mono text-xs text-neutral-500">{s.studentCode}</p>
                    </div>
                    <button
                      type="button"
                      disabled={enrollMutation.isPending}
                      onClick={() => enrollMutation.mutate(s.id)}
                      className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-semibold text-neutral-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40"
                    >
                      Ghi danh
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1 min-h-touch content-center text-sm font-semibold text-neutral-800">
            Đã ghi danh {enrolledStudents.length} học sinh
          </p>
          <div className="mt-2 max-h-72 overflow-y-auto rounded-card border border-neutral-200">
            {enrolledStudents.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Chưa có học sinh nào trong lớp" />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {enrolledStudents.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="grid size-8 flex-none place-items-center rounded-full bg-success-50 text-xs font-bold text-success-700">
                      {initials(s.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">{s.fullName}</p>
                      <p className="font-mono text-xs text-neutral-500">{s.studentCode}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget(s)}
                      className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-semibold text-neutral-600 transition hover:border-danger-300 hover:bg-danger-50 hover:text-danger-700"
                    >
                      Rút khỏi lớp
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        size="sm"
        title="Rút học sinh khỏi lớp?"
        description={
          confirmTarget
            ? `Học sinh "${confirmTarget.fullName}" sẽ được gỡ khỏi lớp này. Có thể ghi danh lại sau.`
            : undefined
        }
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="danger"
            disabled={unenrollMutation.isPending}
            onClick={() => confirmTarget && unenrollMutation.mutate(confirmTarget.id)}
          >
            {unenrollMutation.isPending ? "Đang xử lý..." : "Xác nhận rút"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirmTarget(null)}>
            Hủy
          </Button>
        </div>
      </Modal>
    </div>
  );
}
