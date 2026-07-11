import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSubjects, setSubjectStatus } from "@/services/firestore/subjects";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

export function SubjectsList() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data: subjects, isLoading, isError, refetch } = useQuery({
    queryKey: ["subjects"],
    queryFn: listSubjects,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) =>
      setSubjectStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const filtered = useMemo(() => {
    if (!subjects) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return subjects;
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(keyword) || s.code.toLowerCase().includes(keyword),
    );
  }, [subjects, search]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách môn học." onRetry={() => refetch()} />;
  if (!subjects || subjects.length === 0) {
    return <EmptyState title="Chưa có môn học nào" description="Thêm môn học ở form phía trên." />;
  }

  return (
    <div>
      <div className="mb-3">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tìm theo tên hoặc mã môn học" />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Không tìm thấy môn học phù hợp" />
      ) : (
        <>
          <ul className="divide-y divide-neutral-100">
          {pageItems.map((subject) => (
            <li key={subject.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-800">{subject.name}</p>
                <p className="text-xs text-neutral-500">{subject.code}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={subject.status === "active" ? "success" : "neutral"}>
                  {subject.status === "active" ? "Đang dùng" : "Đã lưu trữ"}
                </StatusBadge>
                <button
                  type="button"
                  onClick={() =>
                    statusMutation.mutate({
                      id: subject.id,
                      status: subject.status === "active" ? "archived" : "active",
                    })
                  }
                  disabled={statusMutation.isPending}
                  className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                >
                  {subject.status === "active" ? "Lưu trữ" : "Kích hoạt lại"}
                </button>
              </div>
            </li>
          ))}
          </ul>
          <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
