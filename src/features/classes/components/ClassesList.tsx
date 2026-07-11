import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listClasses } from "@/services/firestore/classes";
import { classDetailPath } from "@/constants/routes";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import type { ClassDoc, ClassStatus } from "@/types/academic";

interface ClassesListProps {
  onEdit: (klass: ClassDoc & { id: string }) => void;
}

const STATUS_TONE: Record<ClassStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  completed: "neutral",
  cancelled: "danger",
};
const STATUS_LABEL: Record<ClassStatus, string> = {
  active: "Đang hoạt động",
  completed: "Đã kết thúc",
  cancelled: "Đã hủy",
};

export function ClassesList({ onEdit }: ClassesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");

  const { data: classes, isLoading, isError, refetch } = useQuery({
    queryKey: ["classes"],
    queryFn: listClasses,
  });

  const filtered = useMemo(() => {
    if (!classes) return [];
    const keyword = search.trim().toLowerCase();
    return classes.filter((c) => {
      const matchesKeyword = !keyword || c.name.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [classes, search, statusFilter]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách lớp học." onRetry={() => refetch()} />;
  if (!classes || classes.length === 0) {
    return <EmptyState title="Chưa có lớp học nào" description="Tạo lớp học ở form phía trên." />;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tìm theo tên lớp" />
        <select
          aria-label="Lọc theo trạng thái"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as ClassStatus | "all"); setPage(1); }}
          className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="completed">Đã kết thúc</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Không tìm thấy lớp học phù hợp" />
      ) : (
        <>
          <ul className="divide-y divide-neutral-100">
          {pageItems.map((klass) => (
            <li key={klass.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link to={classDetailPath(klass.id)} className="text-sm font-medium text-primary-700 hover:underline">
                  {klass.name}
                </Link>
                <p className="text-xs text-neutral-500">
                  {klass.studentIds.length} học sinh · {klass.scheduleText || "Chưa có lịch"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={STATUS_TONE[klass.status]}>{STATUS_LABEL[klass.status]}</StatusBadge>
                <button
                  type="button"
                  onClick={() => onEdit(klass)}
                  className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Sửa
                </button>
                <Link
                  to={classDetailPath(klass.id)}
                  className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 flex items-center"
                >
                  Quản lý học sinh
                </Link>
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
