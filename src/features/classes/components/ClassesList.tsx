import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { classDetailPath, sessionsForClassPath } from "@/constants/routes";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterField, FilterSelect } from "@/components/ui/FilterToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL_ALWAYS } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import type { ClassDoc, ClassStatus } from "@/types/academic";

interface ClassesListProps {
  onEdit: (klass: ClassDoc & { id: string }) => void;
  onDelete?: (klass: ClassDoc & { id: string }) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  primaryAction?: ReactNode;
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
const STATUS_FILTERS: { value: ClassStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "completed", label: "Đã kết thúc" },
  { value: "cancelled", label: "Đã hủy" },
];

const ROW_ICON_ACTION = "grid size-10 shrink-0 place-items-center rounded-input border border-neutral-200 bg-white text-neutral-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700";

export function ClassesList({ onDelete, onEdit, canDelete = false, canEdit = false, primaryAction }: ClassesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");
  const deferredSearch = useDeferredValue(search);

  const { data: classes, isLoading, isError, refetch } = useQuery({
    queryKey: ["classes"],
    queryFn: listClasses,
  });

  // Tái dùng listCourses/listSubjects/listUsersByRole đã có sẵn (dùng trong ClassForm/StudentsList/
  // ClassDetailPage) để hiện tên khóa học + môn học + giáo viên thay vì ID thô. Cùng queryKey nên
  // React Query cache chung giữa các trang, không phát sinh loại truy vấn Firestore mới.
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses, staleTime: 60_000 });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: listSubjects, staleTime: 60_000 });
  const teachersQuery = useQuery({
    queryKey: ["users", "teacher"],
    queryFn: () => listUsersByRole(USER_ROLES.TEACHER),
    staleTime: 60_000,
  });

  const courseById = useMemo(
    () => new Map((coursesQuery.data ?? []).map((item) => [item.id, item])),
    [coursesQuery.data],
  );
  const subjectById = useMemo(
    () => new Map((subjectsQuery.data ?? []).map((item) => [item.id, item])),
    [subjectsQuery.data],
  );
  const teacherById = useMemo(
    () => new Map((teachersQuery.data ?? []).map((item) => [item.uid, item])),
    [teachersQuery.data],
  );

  const filtered = useMemo(() => {
    if (!classes) return [];
    const keyword = deferredSearch.trim().toLowerCase();
    return classes.filter((c) => {
      const courseName = courseById.get(c.courseId)?.name ?? "";
      const matchesKeyword =
        !keyword || c.name.toLowerCase().includes(keyword) || courseName.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [classes, courseById, deferredSearch, statusFilter]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  const filterToolbar = (
    <section aria-label="Tìm kiếm và lọc lớp học" className="mb-3 rounded-card border border-neutral-200 bg-white p-3 shadow-[var(--shadow-1)] sm:p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(320px,1fr)_200px_auto] md:items-end">
        <FilterField label="Tìm kiếm" htmlFor="class-search">
          <SearchInput
            id="class-search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm theo tên lớp hoặc khóa học"
          />
        </FilterField>
        <FilterSelect
          id="class-status-filter"
          label="Trạng thái"
          value={statusFilter}
          options={STATUS_FILTERS}
          onChange={(value) => {
            setStatusFilter(value as ClassStatus | "all");
            setPage(1);
          }}
        />
        {primaryAction && <div className="grid md:min-w-36">{primaryAction}</div>}
      </div>
    </section>
  );

  if (isLoading) return <>{filterToolbar}<LoadingSkeleton rows={3} /></>;
  if (isError) return <>{filterToolbar}<ErrorState message="Không tải được danh sách lớp học." onRetry={() => refetch()} /></>;
  if (!classes || classes.length === 0) {
    return <>{filterToolbar}<EmptyState title="Chưa có lớp học nào" description="Tạo lớp học ở nút phía trên." /></>;
  }

  return (
    <div>
      {filterToolbar}

      <DataListPanel className="rounded-card border border-neutral-200 bg-white">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Danh sách lớp học</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{filtered.length} lớp phù hợp bộ lọc</p>
          </div>
          <span className="hidden text-xs font-medium text-neutral-400 sm:block">Chọn tên lớp hoặc “Mở lớp” để xem chi tiết</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10 sm:px-5">
            <EmptyState title="Không tìm thấy lớp học phù hợp" />
          </div>
        ) : (
          <>
            <div
              className={DATA_LIST_SCROLL_ALWAYS}
              role="region"
              aria-label="Danh sách lớp học có thể cuộn"
              tabIndex={0}
            >
              <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
                <caption className="sr-only">Danh sách lớp học cùng giáo viên, sĩ số, lịch học, trạng thái và thao tác</caption>
                <thead className="sticky top-0 z-10 bg-neutral-50">
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th scope="col" className="w-[25%] px-4 py-3">
                      Lớp học
                    </th>
                    <th scope="col" className="w-[16%] px-4 py-3">
                      Giáo viên
                    </th>
                    <th scope="col" className="w-[7%] px-3 py-3 text-center">
                      Sĩ số
                    </th>
                    <th scope="col" className="w-[18%] px-4 py-3">
                      Lịch &amp; địa điểm
                    </th>
                    <th scope="col" className="w-[14%] px-4 py-3">
                      Trạng thái
                    </th>
                    <th scope="col" className="w-[20%] px-4 py-3 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((klass) => {
                    const course = courseById.get(klass.courseId);
                    const subjectNames = klass.subjectIds
                      .map((id) => subjectById.get(id)?.name)
                      .filter((name): name is string => !!name);
                    const teacherNames = klass.teacherIds
                      .map((id) => teacherById.get(id)?.displayName)
                      .filter((name): name is string => !!name);

                    return (
                      <tr key={klass.id} className="transition-colors hover:bg-primary-50/40">
                        <td className="px-4 py-3.5">
                          <Link to={classDetailPath(klass.id)} className="font-medium text-primary-700 hover:underline">
                            {klass.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-neutral-500">{course?.name ?? "Chưa gắn khóa học"}</p>
                          {subjectNames.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {subjectNames.map((name) => (
                                <span key={name} className="inline-block rounded-full bg-primary-50 px-2 py-0.5 text-3xs font-semibold text-primary-700">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {teacherNames.length > 0 ? (
                            <span className="text-neutral-800">
                              {teacherNames[0]}
                              {teacherNames.length > 1 && (
                                <span className="ml-1 text-xs text-neutral-400">+{teacherNames.length - 1}</span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning-700">
                              <AlertTriangle size={13} aria-hidden="true" />
                              Chưa gán
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-center font-semibold tabular-nums text-neutral-800">
                          {klass.studentIds.length}
                        </td>
                        <td className="px-4 py-3.5 text-neutral-600">
                          {klass.scheduleText || <span className="text-xs font-semibold text-warning-700">Chưa có lịch</span>}
                          {klass.location && <span className="block text-xs text-neutral-400">{klass.location}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge tone={STATUS_TONE[klass.status]}>{STATUS_LABEL[klass.status]}</StatusBadge>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={sessionsForClassPath(klass.id)}
                              className={ROW_ICON_ACTION}
                              aria-label={`Xem lịch lớp ${klass.name}`}
                              title="Xem lịch"
                            >
                              <CalendarDays size={16} aria-hidden="true" />
                            </Link>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => onEdit(klass)}
                                className={ROW_ICON_ACTION}
                                aria-label={`Chỉnh sửa lớp học ${klass.name}`}
                                title="Chỉnh sửa lớp học"
                              >
                                <Pencil size={16} aria-hidden="true" />
                              </button>
                            )}
                            {canDelete && klass.status !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() => onDelete?.(klass)}
                                className={`${ROW_ICON_ACTION} text-danger-600 hover:border-danger-200 hover:bg-danger-50 hover:text-danger-700`}
                                aria-label={`Xóa lớp ${klass.name}`}
                                title="Xóa lớp"
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            )}
                            <Link
                              to={classDetailPath(klass.id)}
                              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-input bg-primary-50 px-3 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
                            >
                              Mở lớp <ArrowUpRight size={15} aria-hidden="true" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={DATA_LIST_FOOTER}>
              <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} itemLabel="lớp" />
            </div>
          </>
        )}
      </DataListPanel>

    </div>
  );
}
