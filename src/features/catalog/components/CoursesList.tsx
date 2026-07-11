import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCourses, setCourseStatus } from "@/services/firestore/courses";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import type { CourseStatus } from "@/types/academic";

const STATUS_TONE: Record<CourseStatus, "success" | "neutral" | "warning"> = {
  draft: "warning",
  active: "success",
  completed: "neutral",
};
const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Nháp",
  active: "Đang mở",
  completed: "Đã kết thúc",
};

function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

export function CoursesList() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data: courses, isLoading, isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CourseStatus }) => setCourseStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });

  const filtered = useMemo(() => {
    if (!courses) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return courses;
    return courses.filter((c) => c.name.toLowerCase().includes(keyword));
  }, [courses, search]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách khóa học." onRetry={() => refetch()} />;
  if (!courses || courses.length === 0) {
    return <EmptyState title="Chưa có khóa học nào" description="Thêm khóa học ở form phía trên." />;
  }

  return (
    <div>
      <div className="mb-3">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tìm theo tên khóa học" />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Không tìm thấy khóa học phù hợp" />
      ) : (
        <>
          <ul className="divide-y divide-neutral-100">
          {pageItems.map((course) => (
            <li key={course.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-800">{course.name}</p>
                <p className="text-xs text-neutral-500">
                  {formatVnd(course.tuitionFee)} · {course.totalSessions} buổi
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={STATUS_TONE[course.status]}>{STATUS_LABEL[course.status]}</StatusBadge>
                <select
                  aria-label={`Đổi trạng thái ${course.name}`}
                  value={course.status}
                  onChange={(e) =>
                    statusMutation.mutate({ id: course.id, status: e.target.value as CourseStatus })
                  }
                  disabled={statusMutation.isPending}
                  className="min-h-touch rounded-input border border-neutral-300 px-2 text-xs font-medium text-neutral-600 disabled:opacity-40"
                >
                  <option value="draft">Nháp</option>
                  <option value="active">Đang mở</option>
                  <option value="completed">Đã kết thúc</option>
                </select>
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
