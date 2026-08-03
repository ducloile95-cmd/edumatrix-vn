import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { listSubjects, setSubjectStatus } from "@/services/firestore/subjects";
import { listCourses } from "@/services/firestore/courses";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterField } from "@/components/ui/FilterToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import type { SubjectDoc } from "@/types/academic";

interface SubjectsListProps {
  canManage?: boolean;
  onEdit: (subject: SubjectDoc & { id: string }) => void;
  onAdd: () => void;
  /** Môn đang được chọn để lọc bảng khóa học bên cạnh. */
  selectedSubjectId: string | null;
  onSelect: (subjectId: string) => void;
}

/** Chiều cao khóa cùng CoursesList để hai bảng luôn thẳng hàng. */
export function SubjectsList({ canManage = true, onEdit, onAdd, selectedSubjectId, onSelect }: SubjectsListProps) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data: subjects, isLoading, isError, refetch } = useQuery({
    queryKey: ["subjects"],
    queryFn: listSubjects,
  });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses, staleTime: 60_000 });

  const courseCountBySubject = useMemo(() => {
    const counts = new Map<string, number>();
    (coursesQuery.data ?? []).forEach((course) => {
      course.subjectIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    });
    return counts;
  }, [coursesQuery.data]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) => setSubjectStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const filtered = useMemo(() => {
    if (!subjects) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return subjects;
    return subjects.filter(
      (subject) => subject.name.toLowerCase().includes(keyword) || subject.code.toLowerCase().includes(keyword),
    );
  }, [subjects, search]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered, 10);
  const hasRows = !isLoading && !isError && filtered.length > 0;
  const tableGridClass = canManage
    ? "sm:grid-cols-[minmax(0,1fr)_100px_64px_minmax(112px,auto)]"
    : "sm:grid-cols-[minmax(0,1fr)_100px_64px]";

  return (
    <DataListPanel className="rounded-card border border-neutral-200 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-neutral-900">Môn học</h2>
        {canManage && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-touch items-center gap-1.5 rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 active:scale-[.98]"
          >
            <Plus size={14} aria-hidden="true" />
            Thêm môn học
          </button>
        )}
      </div>

      <div className="shrink-0 px-4 pt-3 sm:px-5">
        <FilterField label="Tìm kiếm" htmlFor="subject-search">
          <SearchInput
            id="subject-search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm theo tên hoặc mã môn học"
          />
        </FilterField>
      </div>

      <div className={`${DATA_LIST_SCROLL} px-4 pb-4 pt-3 sm:px-5`}>
        {isLoading && <LoadingSkeleton rows={4} />}
        {isError && <ErrorState message="Không tải được danh sách môn học." onRetry={() => refetch()} />}
        {!isLoading && !isError && (!subjects || subjects.length === 0) && (
          <EmptyState title="Chưa có môn học nào" description="Thêm môn học ở nút phía trên." />
        )}
        {!isLoading && !isError && subjects && subjects.length > 0 && filtered.length === 0 && (
          <EmptyState title="Không tìm thấy môn học phù hợp" />
        )}

        {hasRows && (
          <div role="table" aria-label="Danh sách môn học" className="overflow-hidden rounded-input border border-neutral-200">
            <div role="rowgroup">
              <div role="row" className={`hidden items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 sm:grid ${tableGridClass}`}>
                <span role="columnheader" className="text-2xs font-bold text-neutral-500">Môn học</span>
                <span role="columnheader" className="text-2xs font-bold text-neutral-500">Trạng thái</span>
                <span role="columnheader" className="text-center text-2xs font-bold text-neutral-500">Khóa học</span>
                {canManage && <span role="columnheader" className="text-right text-2xs font-bold text-neutral-500">Thao tác</span>}
              </div>
            </div>

            <div role="rowgroup">
              {pageItems.map((subject) => {
                const isSelected = selectedSubjectId === subject.id;
                const count = courseCountBySubject.get(subject.id) ?? 0;
                return (
                  <div
                    key={subject.id}
                    role="row"
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-neutral-100 px-3 py-3 transition-colors last:border-b-0 sm:gap-2 sm:px-0 sm:py-0 ${tableGridClass} ${isSelected ? "bg-primary-50" : "bg-white hover:bg-neutral-50/70"}`}
                  >
                    <div role="cell" className="min-w-0 sm:px-3 sm:py-3">
                      <button
                        type="button"
                        onClick={() => onSelect(subject.id)}
                        aria-pressed={isSelected}
                        className="block min-h-touch w-full min-w-0 rounded-input text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                      >
                        <span className="block truncate text-sm font-semibold text-neutral-900">{subject.name}</span>
                        <span className="mt-0.5 block font-mono text-2xs font-medium text-neutral-500">{subject.code}</span>
                      </button>
                    </div>

                    <div role="cell" className="col-start-1 row-start-2 mt-2 sm:col-start-auto sm:row-start-auto sm:mt-0 sm:py-3">
                      <StatusBadge tone={subject.status === "active" ? "success" : "neutral"}>
                        {subject.status === "active" ? "Đang dùng" : "Đã lưu trữ"}
                      </StatusBadge>
                    </div>

                    <div role="cell" className="col-start-2 row-start-1 self-start sm:col-start-auto sm:row-start-auto sm:self-auto sm:text-center">
                      <span className="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-bold tabular-nums text-primary-700 sm:bg-transparent sm:px-0 sm:text-sm sm:text-neutral-700">
                        {count}<span className="ml-1 sm:hidden">khóa</span>
                      </span>
                    </div>

                    {canManage && (
                      <div role="cell" className="col-start-2 row-start-2 mt-2 flex justify-end gap-1.5 sm:col-start-auto sm:row-start-auto sm:mt-0 sm:px-3 sm:py-2">
                        <button
                          type="button"
                          onClick={() => onEdit(subject)}
                          className="min-h-touch whitespace-nowrap rounded-input border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 transition hover:border-primary-300 hover:text-primary-700 active:scale-[.98]"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            statusMutation.mutate({
                              id: subject.id,
                              status: subject.status === "active" ? "archived" : "active",
                            })
                          }
                          disabled={statusMutation.isPending}
                          className="min-h-touch whitespace-nowrap rounded-input border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 transition hover:border-primary-300 hover:text-primary-700 active:scale-[.98] disabled:opacity-40"
                        >
                          {subject.status === "active" ? "Lưu trữ" : "Kích hoạt lại"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hasRows && (
        <div className={DATA_LIST_FOOTER}>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            itemLabel="môn học"
          />
        </div>
      )}
    </DataListPanel>
  );
}
