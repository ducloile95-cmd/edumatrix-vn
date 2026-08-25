import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { deleteSubject, listSubjects, setSubjectStatus } from "@/services/firestore/subjects";
import { listCourses } from "@/services/firestore/courses";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DeletionPreflightPanel } from "@/components/feedback/DeletionPreflightPanel";
import { useDeletionPreflight } from "@/hooks/useDeletionPreflight";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterField } from "@/components/ui/FilterToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import type { SubjectDoc } from "@/types/academic";

interface SubjectsListProps {
  canManage?: boolean;
  canDelete?: boolean;
  onEdit: (subject: SubjectDoc & { id: string }) => void;
  onAdd: () => void;
  /** Môn đang được chọn để lọc bảng khóa học bên cạnh. */
  selectedSubjectId: string | null;
  onSelect: (subjectId: string) => void;
}

/** Chiều cao khóa cùng CoursesList để hai bảng luôn thẳng hàng. */
export function SubjectsList({ canManage = true, canDelete = canManage, onEdit, onAdd, selectedSubjectId, onSelect }: SubjectsListProps) {
  const [search, setSearch] = useState("");
  const [deletingSubject, setDeletingSubject] = useState<(SubjectDoc & { id: string }) | null>(null);
  const queryClient = useQueryClient();
  const { data: subjects, isLoading, isError, refetch } = useQuery({
    queryKey: ["subjects"],
    queryFn: listSubjects,
  });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses, staleTime: 60_000 });
  const deletePreflight = useDeletionPreflight("subject", deletingSubject?.id ?? null);

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
  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setDeletingSubject(null);
    },
  });
  const closeDeleteDialog = () => {
    if (deleteMutation.isPending) return;
    setDeletingSubject(null);
    deleteMutation.reset();
  };

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
  const canAct = canManage || canDelete;
  const tableGridClass = canAct
    ? "sm:grid-cols-[minmax(0,1fr)_64px_100px_minmax(144px,auto)]"
    : "sm:grid-cols-[minmax(0,1fr)_64px_100px]";

  return (
    <>
    <DataListPanel className="rounded-card border border-neutral-200 bg-neutral-0">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-neutral-900">Môn học</h2>
        {canManage && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-touch items-center gap-1.5 rounded-input border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
                <span role="columnheader" className="text-center text-2xs font-bold text-neutral-500">Khóa học</span>
                <span role="columnheader" className="text-2xs font-bold text-neutral-500">Trạng thái</span>
                {canAct && <span role="columnheader" className="text-right text-2xs font-bold text-neutral-500">Thao tác</span>}
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
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-neutral-100 px-3 py-3 transition-colors last:border-b-0 sm:gap-2 sm:px-0 sm:py-0 ${tableGridClass} ${isSelected ? "bg-primary-50" : "bg-neutral-0 hover:bg-neutral-50/70"}`}
                  >
                    <div role="cell" className="min-w-0 sm:px-3 sm:py-3">
                      <span className="block truncate text-sm font-semibold text-neutral-900">{subject.name}</span>
                      <span className="mt-0.5 block font-mono text-2xs font-medium text-neutral-500">{subject.code}</span>
                    </div>

                    <div role="cell" className="col-start-2 row-start-1 self-start sm:col-start-auto sm:row-start-auto sm:self-auto sm:text-center">
                      <button
                        type="button"
                        onClick={() => onSelect(subject.id)}
                        aria-pressed={isSelected}
                        aria-label={`Lọc ${count} khóa học của môn ${subject.name}`}
                        className="inline-flex min-h-touch items-center rounded-full bg-primary-50 px-2 text-2xs font-bold tabular-nums text-primary-700 transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 sm:text-sm"
                      >
                        {count}<span className="ml-1 sm:hidden">khóa</span>
                      </button>
                    </div>

                    <div role="cell" className="col-start-1 row-start-2 mt-2 sm:col-start-auto sm:row-start-auto sm:mt-0 sm:py-3">
                      <StatusBadge tone={subject.status === "active" ? "success" : "neutral"}>
                        {subject.status === "active" ? "Đang dùng" : "Đã lưu trữ"}
                      </StatusBadge>
                    </div>

                    {canAct && (
                      <div role="cell" className="col-start-2 row-start-2 mt-2 flex justify-end gap-1.5 sm:col-start-auto sm:row-start-auto sm:mt-0 sm:px-3 sm:py-2">
                        {canManage && <button
                          type="button"
                          onClick={() => onEdit(subject)}
                          aria-label={`Sửa môn ${subject.name}`}
                          title="Sửa môn học"
                          className="grid size-11 shrink-0 place-items-center rounded-input border border-neutral-300 bg-white text-neutral-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        >
                          <Pencil size={17} aria-hidden="true" />
                        </button>}
                        {canManage && <button
                          type="button"
                          onClick={() =>
                            statusMutation.mutate({
                              id: subject.id,
                              status: subject.status === "active" ? "archived" : "active",
                            })
                          }
                          disabled={statusMutation.isPending}
                          aria-label={subject.status === "active" ? `Lưu trữ môn ${subject.name}` : `Kích hoạt lại môn ${subject.name}`}
                          title={subject.status === "active" ? "Lưu trữ môn học" : "Kích hoạt lại môn học"}
                          className="grid size-11 shrink-0 place-items-center rounded-input border border-neutral-300 bg-white text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        >
                          {subject.status === "active" ? <Archive size={17} aria-hidden="true" /> : <RotateCcw size={17} aria-hidden="true" />}
                        </button>}
                        {canDelete && <button
                          type="button"
                          onClick={() => { deleteMutation.reset(); setDeletingSubject(subject); }}
                          className="grid size-11 shrink-0 place-items-center rounded-input border border-danger-200 bg-white text-danger-700 transition hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2"
                          aria-label={`Xóa vĩnh viễn môn học ${subject.name}`}
                          title="Xóa vĩnh viễn môn học"
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>}
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
    <Modal
      open={Boolean(deletingSubject)}
      onClose={closeDeleteDialog}
      size="sm"
      title="Xóa vĩnh viễn môn học?"
      description={deletingSubject ? `Môn học "${deletingSubject.name}" sẽ bị xóa trực tiếp khỏi database. Hành động này không thể hoàn tác.` : undefined}
    >
      {deleteMutation.isError && <p role="alert" className="mb-4 rounded-input bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">
        {deleteMutation.error instanceof Error && deleteMutation.error.message === "DELETION_BLOCKED"
          ? "Dữ liệu liên quan vừa thay đổi. Hệ thống đã dừng thao tác xóa."
          : deleteMutation.error instanceof Error && deleteMutation.error.message === "SUBJECT_NOT_FOUND"
            ? "Môn học không còn tồn tại. Hãy tải lại danh sách."
            : "Không thể xóa môn học. Kiểm tra quyền truy cập và thử lại."}
      </p>}
      <DeletionPreflightPanel loading={deletePreflight.isFetching} error={deletePreflight.isError} report={deletePreflight.data} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" disabled={deleteMutation.isPending} onClick={closeDeleteDialog}>Giữ môn học</Button>
        <Button variant="danger" disabled={!deletePreflight.data?.allowed || deletePreflight.isFetching} loading={deleteMutation.isPending} loadingLabel="Đang xóa môn học" onClick={() => deletingSubject && deleteMutation.mutate(deletingSubject.id)}>Xóa vĩnh viễn</Button>
      </div>
    </Modal>
    </>
  );
}
