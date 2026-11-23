import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Archive, CheckCircle2, FileText, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteCourse, listCourses, setCourseStatus } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { formatVnd } from "@/utils/currency";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DeletionPreflightPanel } from "@/components/feedback/DeletionPreflightPanel";
import { useDeletionPreflight } from "@/hooks/useDeletionPreflight";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterField, FilterSelect } from "@/components/ui/FilterToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import type { CourseDoc, CourseStatus } from "@/types/academic";

interface CoursesListProps {
  canManage?: boolean;
  canDelete?: boolean;
  onEdit: (course: CourseDoc & { id: string }) => void;
  onAdd: () => void;
  /** Mon hoc dang loc, dieu khien tu panel Mon hoc ben canh (gop thong tin 2 nhanh). */
  subjectFilter: string | null;
  onClearSubjectFilter: () => void;
}

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
const STATUS_FILTERS: { value: CourseStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "active", label: "Đang mở" },
  { value: "completed", label: "Đã kết thúc" },
];

/** Chieu cao co dinh, khoa cung SubjectsList de 2 bang luon bang nhau (khong lech do so dong khac nhau). */
export function CoursesList({ canManage = true, canDelete = canManage, onEdit, onAdd, subjectFilter, onClearSubjectFilter }: CoursesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");
  const [deletingCourse, setDeletingCourse] = useState<(CourseDoc & { id: string }) | null>(null);
  const queryClient = useQueryClient();

  const { data: courses, isLoading, isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });
  // Tai dung listSubjects() (cung queryKey voi CourseForm/SubjectsList) de hien chip ten mon
  // thay vi ID tho, khong phat sinh loai truy van Firestore moi.
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const deletePreflight = useDeletionPreflight("course", deletingCourse?.id ?? null);
  const subjectById = useMemo(
    () => new Map((subjectsQuery.data ?? []).map((s) => [s.id, s])),
    [subjectsQuery.data],
  );
  const subjectFilterName = subjectFilter ? subjectById.get(subjectFilter)?.name ?? subjectFilter : null;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CourseStatus }) => setCourseStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setDeletingCourse(null);
    },
  });
  const closeDeleteDialog = () => {
    if (deleteMutation.isPending) return;
    setDeletingCourse(null);
    deleteMutation.reset();
  };

  const filtered = useMemo(() => {
    if (!courses) return [];
    const keyword = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesKeyword = !keyword || c.name.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesSubject = !subjectFilter || c.subjectIds.includes(subjectFilter);
      return matchesKeyword && matchesStatus && matchesSubject;
    });
  }, [courses, search, statusFilter, subjectFilter]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  const hasRows = !isLoading && !isError && filtered.length > 0;

  return (
    <>
    <DataListPanel className="rounded-card border border-neutral-200 bg-neutral-0">
      <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Danh sách khóa học</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {courses ? `${filtered.length} khóa học phù hợp bộ lọc` : "Đang tải..."}
            </p>
          </div>
          {canManage && <Button variant="primary" size="sm"
            type="button"
            onClick={onAdd}
           
          >
            <Plus size={14} aria-hidden="true" />
            Thêm khóa học
          </Button>}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px] md:items-end">
          <FilterField label="Tìm kiếm" htmlFor="course-search">
            <SearchInput
              id="course-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Tìm theo tên khóa học"
            />
          </FilterField>
          <FilterSelect
            id="course-status-filter"
            label="Trạng thái"
            value={statusFilter}
            options={STATUS_FILTERS}
            onChange={(value) => {
              setStatusFilter(value as CourseStatus | "all");
              setPage(1);
            }}
          />
        </div>

        {subjectFilter && (
          <button
            type="button"
            onClick={onClearSubjectFilter}
            className="mt-3 inline-flex min-h-touch items-center gap-2 rounded-full bg-primary-500 py-1 pl-3 pr-2 text-xs font-bold text-white"
          >
            Đang lọc theo môn: {subjectFilterName}
            <span className="grid size-[18px] place-items-center rounded-full bg-white/25">
              <X size={11} aria-hidden="true" />
            </span>
            <span className="sr-only">Xóa bộ lọc môn học</span>
          </button>
        )}
      </div>

      <div className={DATA_LIST_SCROLL}>
        {isLoading && (
          <div className="p-4 sm:p-5">
            <LoadingSkeleton rows={5} />
          </div>
        )}
        {isError && (
          <div className="p-4 sm:p-5">
            <ErrorState message="Không tải được danh sách khóa học." onRetry={() => refetch()} />
          </div>
        )}
        {!isLoading && !isError && (!courses || courses.length === 0) && (
          <div className="flex h-full items-center justify-center p-4 sm:p-5">
            <EmptyState title="Chưa có khóa học nào" description="Bấm Thêm khóa học để tạo mới." />
          </div>
        )}
        {!isLoading && !isError && courses && courses.length > 0 && filtered.length === 0 && (
          <div className="flex h-full items-center justify-center p-4 sm:p-5">
            <EmptyState title="Không tìm thấy khóa học phù hợp" />
          </div>
        )}

        {hasRows && (
          <table className="hidden w-full min-w-[900px] border-collapse text-sm md:table">
            <thead className="sticky top-0 z-10 bg-neutral-50">
              <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th scope="col" className="px-4 py-3">Khóa học</th>
                <th scope="col" className="px-4 py-3">Trạng thái</th>
                <th scope="col" className="px-4 py-3">Thời lượng</th>
                <th scope="col" className="px-4 py-3 text-center">Số buổi</th>
                <th scope="col" className="px-4 py-3 text-right">Học phí/buổi</th>
                <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageItems.map((course) => {
                const subjectNames = course.subjectIds
                  .map((id) => subjectById.get(id)?.name)
                  .filter((name): name is string => !!name);
                const shownNames = subjectNames.slice(0, 3);
                const extraCount = subjectNames.length - shownNames.length;

                return (
                  <tr key={course.id} className="transition hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{course.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {shownNames.length === 0 ? (
                          <span className="text-xs text-neutral-400">Chưa gắn môn học</span>
                        ) : (
                          <>
                            {shownNames.map((name) => (
                              <span
                                key={name}
                                className="rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-semibold text-primary-700"
                              >
                                {name}
                              </span>
                            ))}
                            {extraCount > 0 && (
                              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-2xs font-semibold text-neutral-500">
                                +{extraCount}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={STATUS_TONE[course.status]}>{STATUS_LABEL[course.status]}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {format(course.startDate.toDate(), "dd/MM/yyyy")} → {format(course.endDate.toDate(), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-neutral-800">{course.totalSessions}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-800">
                      {formatVnd(course.pricePerSession ?? Math.round(course.tuitionFee / course.totalSessions))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(canManage || canDelete) && (
                        <div className="flex justify-end gap-1.5">
                          {canManage && <button
                            type="button"
                            onClick={() => onEdit(course)}
                            aria-label={`Sửa ${course.name}`}
                            title="Sửa khóa học"
                            className="grid size-11 shrink-0 place-items-center rounded-input border border-neutral-300 bg-neutral-0 text-neutral-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                          >
                            <Pencil size={17} aria-hidden="true" />
                          </button>}
                          {canManage && <details className="group relative">
                            <summary
                              aria-label={`Cập nhật trạng thái ${course.name}`}
                              title="Cập nhật trạng thái"
                              className="grid size-11 cursor-pointer list-none place-items-center rounded-input border border-neutral-300 bg-neutral-0 text-neutral-600 transition marker:content-none hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
                            >
                              <MoreHorizontal size={18} aria-hidden="true" />
                            </summary>
                            <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 rounded-card border border-neutral-200 bg-neutral-0 p-1.5 text-left shadow-lg">
                              {course.status !== "active" && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    statusMutation.mutate({ id: course.id, status: "active" });
                                    event.currentTarget.closest("details")?.removeAttribute("open");
                                  }}
                                  disabled={statusMutation.isPending}
                                  className="flex min-h-touch w-full items-center gap-2 rounded-input px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                                >
                                  <CheckCircle2 size={16} aria-hidden="true" /> Đang mở
                                </button>
                              )}
                              {course.status !== "draft" && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    statusMutation.mutate({ id: course.id, status: "draft" });
                                    event.currentTarget.closest("details")?.removeAttribute("open");
                                  }}
                                  disabled={statusMutation.isPending}
                                  className="flex min-h-touch w-full items-center gap-2 rounded-input px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                                >
                                  <FileText size={16} aria-hidden="true" /> Chuyển về nháp
                                </button>
                              )}
                              {course.status !== "completed" && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    statusMutation.mutate({ id: course.id, status: "completed" });
                                    event.currentTarget.closest("details")?.removeAttribute("open");
                                  }}
                                  disabled={statusMutation.isPending}
                                  className="flex min-h-touch w-full items-center gap-2 rounded-input px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                                >
                                  <Archive size={16} aria-hidden="true" /> Đánh dấu kết thúc
                                </button>
                              )}
                            </div>
                          </details>}
                          {canDelete && <button
                            type="button"
                            onClick={() => { deleteMutation.reset(); setDeletingCourse(course); }}
                            className="grid size-11 shrink-0 place-items-center rounded-input border border-danger-200 bg-neutral-0 text-danger-700 transition hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2"
                            aria-label={`Xóa vĩnh viễn khóa học ${course.name}`}
                            title="Xóa vĩnh viễn khóa học"
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {hasRows && (
          <div className="divide-y divide-neutral-100 md:hidden">
            {pageItems.map((course) => {
              const subjectNames = course.subjectIds
                .map((id) => subjectById.get(id)?.name)
                .filter((name): name is string => !!name);
              return (
                <article key={course.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-neutral-900">{course.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {subjectNames.slice(0, 1).map((name) => (
                          <span key={name} className="rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-semibold text-primary-700">{name}</span>
                        ))}
                        {subjectNames.length > 1 && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-semibold text-primary-700">+{subjectNames.length - 1} môn</span>}
                      </div>
                    </div>
                    <StatusBadge tone={STATUS_TONE[course.status]}>{STATUS_LABEL[course.status]}</StatusBadge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-neutral-500">Thời lượng</dt><dd className="mt-0.5 font-medium tabular-nums text-neutral-800">{format(course.startDate.toDate(), "dd/MM")} → {format(course.endDate.toDate(), "dd/MM/yyyy")}</dd></div>
                    <div><dt className="text-neutral-500">Học phí / buổi</dt><dd className="mt-0.5 font-medium tabular-nums text-neutral-800">{formatVnd(course.pricePerSession ?? Math.round(course.tuitionFee / course.totalSessions))} · {course.totalSessions} buổi</dd></div>
                  </dl>
                  {(canManage || canDelete) && (
                    <div className="mt-4 flex justify-end gap-2">
                      {canManage && <Button variant="secondary" size="sm"
                        type="button"
                        onClick={() => onEdit(course)}
                        className="flex-1"
                      >
                        <Pencil size={16} aria-hidden="true" /> Sửa
                      </Button>}
                      {canManage && <details className="group relative">
                        <summary aria-label={`Cập nhật trạng thái ${course.name}`} className="grid size-11 cursor-pointer list-none place-items-center rounded-input border border-neutral-300 bg-neutral-0 text-neutral-600 marker:content-none hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"><MoreHorizontal size={18} aria-hidden="true" /></summary>
                        <div className="absolute bottom-[calc(100%+6px)] right-0 z-30 w-48 rounded-card border border-neutral-200 bg-neutral-0 p-1.5 shadow-lg">
                          {(["active", "draft", "completed"] as CourseStatus[]).filter((status) => status !== course.status).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={(event) => {
                                statusMutation.mutate({ id: course.id, status });
                                event.currentTarget.closest("details")?.removeAttribute("open");
                              }}
                              disabled={statusMutation.isPending}
                              className="min-h-touch w-full rounded-input px-2.5 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                            >
                              {STATUS_LABEL[status]}
                            </button>
                          ))}
                        </div>
                      </details>}
                      {canDelete && <button
                        type="button"
                        onClick={() => { deleteMutation.reset(); setDeletingCourse(course); }}
                        className="grid size-11 shrink-0 place-items-center rounded-input border border-danger-200 bg-neutral-0 text-danger-700 transition hover:bg-danger-50"
                        aria-label={`Xóa vĩnh viễn khóa học ${course.name}`}
                        title="Xóa vĩnh viễn khóa học"
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>}
                    </div>
                  )}
                </article>
              );
            })}
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
            itemLabel="khóa học"
          />
        </div>
      )}
    </DataListPanel>
    <Modal
      open={Boolean(deletingCourse)}
      onClose={closeDeleteDialog}
      size="sm"
      title="Xóa vĩnh viễn khóa học?"
      description={deletingCourse ? `Khóa học "${deletingCourse.name}" sẽ bị xóa trực tiếp khỏi database. Hành động này không thể hoàn tác.` : undefined}
    >
      {deleteMutation.isError && <p role="alert" className="mb-4 rounded-input bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">
        {deleteMutation.error instanceof Error && deleteMutation.error.message === "DELETION_BLOCKED"
          ? "Dữ liệu liên quan vừa thay đổi. Hệ thống đã dừng thao tác xóa."
          : deleteMutation.error instanceof Error && deleteMutation.error.message === "COURSE_NOT_FOUND"
            ? "Khóa học không còn tồn tại. Hãy tải lại danh sách."
            : "Không thể xóa khóa học. Kiểm tra quyền truy cập và thử lại."}
      </p>}
      <DeletionPreflightPanel loading={deletePreflight.isFetching} error={deletePreflight.isError} report={deletePreflight.data} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" disabled={deleteMutation.isPending} onClick={closeDeleteDialog}>Giữ khóa học</Button>
        <Button variant="danger" disabled={!deletePreflight.data?.allowed || deletePreflight.isFetching} loading={deleteMutation.isPending} loadingLabel="Đang xóa khóa học" onClick={() => deletingCourse && deleteMutation.mutate(deletingCourse.id)}>Xóa vĩnh viễn</Button>
      </div>
    </Modal>
    </>
  );
}
