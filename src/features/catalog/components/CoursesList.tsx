import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { X } from "lucide-react";
import { listCourses, setCourseStatus } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { formatVnd } from "@/utils/currency";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import type { CourseDoc, CourseStatus } from "@/types/academic";

interface CoursesListProps {
  onEdit: (course: CourseDoc & { id: string }) => void;
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
export function CoursesList({ onEdit, subjectFilter, onClearSubjectFilter }: CoursesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");
  const queryClient = useQueryClient();

  const { data: courses, isLoading, isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });
  // Tai dung listSubjects() (cung queryKey voi CourseForm/SubjectsList) de hien chip ten mon
  // thay vi ID tho, khong phat sinh loai truy van Firestore moi.
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: listSubjects, staleTime: 60_000 });
  const subjectById = useMemo(
    () => new Map((subjectsQuery.data ?? []).map((s) => [s.id, s])),
    [subjectsQuery.data],
  );
  const subjectFilterName = subjectFilter ? subjectById.get(subjectFilter)?.name ?? subjectFilter : null;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CourseStatus }) => setCourseStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });

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
    <DataListPanel className="rounded-card border border-neutral-200 bg-white">
      <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Danh sách khóa học</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {courses ? `${filtered.length} khóa học phù hợp bộ lọc` : "Đang tải..."}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="course-search" className="mb-1 block text-xs font-semibold text-neutral-500">
              Tìm kiếm
            </label>
            <SearchInput
              id="course-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Tìm theo tên khóa học"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-neutral-500">Trạng thái</p>
            <div className="grid min-h-touch grid-cols-4 gap-1 rounded-input border border-neutral-300 bg-neutral-50 p-1">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  className={`rounded-[7px] px-2 text-xs font-semibold transition ${
                    statusFilter === value
                      ? "bg-primary-500 text-white shadow-[0_4px_12px_rgba(51,102,240,.18)]"
                      : "text-neutral-600 hover:bg-white hover:text-primary-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
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
            <EmptyState title="Chưa có khóa học nào" description="Thêm khóa học ở nút phía trên." />
          </div>
        )}
        {!isLoading && !isError && courses && courses.length > 0 && filtered.length === 0 && (
          <div className="flex h-full items-center justify-center p-4 sm:p-5">
            <EmptyState title="Không tìm thấy khóa học phù hợp" />
          </div>
        )}

        {hasRows && (
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-50">
              <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th scope="col" className="px-4 py-3">Khóa học</th>
                <th scope="col" className="px-4 py-3 text-right">Học phí/buổi</th>
                <th scope="col" className="px-4 py-3 text-center">Số buổi</th>
                <th scope="col" className="px-4 py-3">Thời lượng</th>
                <th scope="col" className="px-4 py-3">Trạng thái</th>
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
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-800">
                      {formatVnd(course.pricePerSession ?? Math.round(course.tuitionFee / course.totalSessions))}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-neutral-800">{course.totalSessions}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {format(course.startDate.toDate(), "dd/MM/yyyy")} → {format(course.endDate.toDate(), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={STATUS_TONE[course.status]}>{STATUS_LABEL[course.status]}</StatusBadge>
                        <select
                          aria-label={`Đổi trạng thái ${course.name}`}
                          value={course.status}
                          onChange={(e) =>
                            statusMutation.mutate({ id: course.id, status: e.target.value as CourseStatus })
                          }
                          disabled={statusMutation.isPending}
                          className="min-h-touch rounded-input border border-neutral-300 px-1.5 text-xs font-medium text-neutral-600 disabled:opacity-40"
                        >
                          <option value="draft">Nháp</option>
                          <option value="active">Đang mở</option>
                          <option value="completed">Đã kết thúc</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onEdit(course)}
                        className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  );
}
