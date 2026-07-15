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
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import type { SubjectDoc } from "@/types/academic";

interface SubjectsListProps {
  onEdit: (subject: SubjectDoc & { id: string }) => void;
  onAdd: () => void;
  /** Mon dang duoc chon de loc bang khoa hoc ben canh (gop thong tin 2 nhanh). */
  selectedSubjectId: string | null;
  onSelect: (subjectId: string) => void;
}

/** Chieu cao co dinh, khoa cung CoursesList de 2 bang luon bang nhau (khong lech do so dong khac nhau). */
const PANEL_HEIGHT = "h-[640px]";

export function SubjectsList({ onEdit, onAdd, selectedSubjectId, onSelect }: SubjectsListProps) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data: subjects, isLoading, isError, refetch } = useQuery({
    queryKey: ["subjects"],
    queryFn: listSubjects,
  });
  // Tai dung listCourses() (cung queryKey voi CoursesList/CourseForm) de tinh so khoa hoc/mon,
  // khong phat sinh loai truy van Firestore moi.
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses, staleTime: 60_000 });

  const courseCountBySubject = useMemo(() => {
    const counts = new Map<string, number>();
    (coursesQuery.data ?? []).forEach((course) => {
      course.subjectIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    });
    return counts;
  }, [coursesQuery.data]);

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
  const { page, pageSize, pageItems, setPage } = usePagination(filtered, 10);

  const hasRows = !isLoading && !isError && filtered.length > 0;

  return (
    <section className={`flex ${PANEL_HEIGHT} flex-col overflow-hidden rounded-card border border-neutral-200 bg-white`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-neutral-900">Môn học</h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Plus size={14} aria-hidden="true" />
          Thêm môn học
        </button>
      </div>

      <div className="shrink-0 px-4 pt-3 sm:px-5">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Tìm theo tên hoặc mã môn học"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-3 sm:p-5 sm:pt-3">
        {isLoading && <LoadingSkeleton rows={4} />}
        {isError && <ErrorState message="Không tải được danh sách môn học." onRetry={() => refetch()} />}
        {!isLoading && !isError && (!subjects || subjects.length === 0) && (
          <EmptyState title="Chưa có môn học nào" description="Thêm môn học ở nút phía trên." />
        )}
        {!isLoading && !isError && subjects && subjects.length > 0 && filtered.length === 0 && (
          <EmptyState title="Không tìm thấy môn học phù hợp" />
        )}

        {hasRows && (
          <ul className="-mx-1 divide-y divide-neutral-100">
            {pageItems.map((subject) => {
              const isSelected = selectedSubjectId === subject.id;
              const count = courseCountBySubject.get(subject.id) ?? 0;
              return (
                <li key={subject.id} className={isSelected ? "rounded-input bg-primary-50" : ""}>
                  <div className="flex items-start gap-2 px-1 py-2.5">
                    <button
                      type="button"
                      onClick={() => onSelect(subject.id)}
                      aria-pressed={isSelected}
                      className="min-w-0 flex-1 rounded-input px-2 py-1 text-left transition hover:bg-primary-50"
                    >
                      <p className="truncate text-sm font-semibold text-neutral-900">{subject.name}</p>
                      <p className="font-mono text-[11px] text-neutral-500">{subject.code}</p>
                    </button>
                    <span className="mt-1 shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary-700">
                      {count} khóa
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 px-2 pb-2.5">
                    <StatusBadge tone={subject.status === "active" ? "success" : "neutral"}>
                      {subject.status === "active" ? "Đang dùng" : "Đã lưu trữ"}
                    </StatusBadge>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(subject)}
                        className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
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
                        className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                      >
                        {subject.status === "active" ? "Lưu trữ" : "Kích hoạt lại"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasRows && (
        <div className="shrink-0 border-t border-neutral-100 px-4 py-3 sm:px-5">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            itemLabel="môn học"
          />
        </div>
      )}
    </section>
  );
}
