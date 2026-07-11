import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudents, setStudentStatus } from "@/services/firestore/students";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES } from "@/constants/roles";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { LinkParentForm } from "@/features/students/components/LinkParentForm";
import type { StudentDoc } from "@/types/academic";

interface StudentsListProps {
  onEdit: (student: StudentDoc & { id: string }) => void;
}

export function StudentsList({ onEdit }: StudentsListProps) {
  const [search, setSearch] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const { data: students, isLoading, isError, refetch } = useQuery({
    queryKey: ["students"],
    queryFn: listStudents,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      setStudentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const filtered = useMemo(() => {
    if (!students) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(keyword) || s.studentCode.toLowerCase().includes(keyword),
    );
  }, [students, search]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách học sinh." onRetry={() => refetch()} />;
  if (!students || students.length === 0) {
    return <EmptyState title="Chưa có học sinh nào" description="Thêm học sinh ở form phía trên." />;
  }

  return (
    <div>
      <div className="mb-3">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tìm theo tên hoặc mã học sinh" />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Không tìm thấy học sinh phù hợp" />
      ) : (
        <>
          <ul className="divide-y divide-neutral-100">
          {pageItems.map((student) => (
            <li key={student.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{student.fullName}</p>
                  <p className="text-xs text-neutral-500">
                    {student.studentCode} · {student.parentUids.length} phụ huynh liên kết
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={student.status === "active" ? "success" : "neutral"}>
                    {student.status === "active" ? "Đang học" : "Ngừng học"}
                  </StatusBadge>
                  <button
                    type="button"
                    onClick={() => onEdit(student)}
                    className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  >
                    Sửa
                  </button>
                  {role === USER_ROLES.ADMIN && (
                    <button
                      type="button"
                      onClick={() => setLinkingId(linkingId === student.id ? null : student.id)}
                      className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                    >
                      Gắn phụ huynh
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      statusMutation.mutate({
                        id: student.id,
                        status: student.status === "active" ? "inactive" : "active",
                      })
                    }
                    disabled={statusMutation.isPending}
                    className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {student.status === "active" ? "Ngừng học" : "Kích hoạt lại"}
                  </button>
                </div>
              </div>
              {linkingId === student.id && (
                <LinkParentForm studentId={student.id} onDone={() => setLinkingId(null)} />
              )}
            </li>
          ))}
          </ul>
          <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
