import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { addDays, isWithinInterval, subDays } from "date-fns";
import { AlertTriangle, CheckCircle2, Sparkles, Users } from "lucide-react";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { classDetailPath, sessionsForClassPath } from "@/constants/routes";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL_ALWAYS } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import type { ClassDoc, ClassStatus } from "@/types/academic";

const NEW_CLASS_WINDOW_DAYS = 30;

interface ClassesListProps {
  onEdit: (klass: ClassDoc & { id: string }) => void;
  onDelete?: (klass: ClassDoc & { id: string }) => void;
  canEdit?: boolean;
  canDelete?: boolean;
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

export function ClassesList({ onDelete, onEdit, canDelete = false, canEdit = false }: ClassesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");

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

  // KPI "Lớp mới sắp tới" — gộp từ tab "Danh sách lớp" cũ của Lịch học (đã bỏ tab đó, chỉ còn
  // Timetable). Lớp active, tạo trong 30 ngày gần đây, còn buổi học chưa diễn ra. Chỉ fan-out
  // theo recentClasses (một tập nhỏ, có giới hạn) chứ không theo toàn bộ danh sách đã phân trang,
  // nên không phát sinh N+1 truy vấn theo số lớp hiển thị trên trang.
  const today = useMemo(() => new Date(), []);
  const recentClasses = useMemo(() => {
    const list = classes ?? [];
    return list.filter(
      (klass) =>
        klass.status === "active" &&
        isWithinInterval(klass.createdAt.toDate(), { start: subDays(today, NEW_CLASS_WINDOW_DAYS), end: today }),
    );
  }, [classes, today]);
  const upcomingForRecentClasses = useQueries({
    queries: recentClasses.map((klass) => ({
      queryKey: ["sessions", "by-class-upcoming", klass.id],
      queryFn: () => listSessionsByClass(klass.id, today, addDays(today, 60)),
    })),
  });
  const newUpcomingClassesCount = recentClasses.filter((_, index) =>
    (upcomingForRecentClasses[index]?.data ?? []).some((s) => s.status !== "cancelled"),
  ).length;

  const filtered = useMemo(() => {
    if (!classes) return [];
    const keyword = search.trim().toLowerCase();
    return classes.filter((c) => {
      const courseName = courseById.get(c.courseId)?.name ?? "";
      const matchesKeyword =
        !keyword || c.name.toLowerCase().includes(keyword) || courseName.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [classes, courseById, search, statusFilter]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  const kpi = useMemo(() => {
    const list = classes ?? [];
    const active = list.filter((c) => c.status === "active");
    const totalStudents = active.reduce((sum, c) => sum + c.studentIds.length, 0);
    const incomplete = active.filter((c) => !c.scheduleText.trim() || c.teacherIds.length === 0).length;
    return { total: list.length, active: active.length, totalStudents, incomplete };
  }, [classes]);

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách lớp học." onRetry={() => refetch()} />;
  if (!classes || classes.length === 0) {
    return <EmptyState title="Chưa có lớp học nào" description="Tạo lớp học ở nút phía trên." />;
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Sparkles}
          tone="accent"
          value={newUpcomingClassesCount}
          label="Lớp mới sắp tới"
          hint={`Tạo trong ${NEW_CLASS_WINDOW_DAYS} ngày gần đây, còn buổi chưa học`}
        />
        <StatCard
          icon={CheckCircle2}
          tone="success"
          value={kpi.active}
          label="Đang hoạt động"
          hint={`${kpi.total - kpi.active} lớp đã kết thúc/hủy`}
        />
        <StatCard
          icon={Users}
          tone="info"
          value={kpi.totalStudents}
          label="Học sinh đang học"
          hint="Cộng dồn các lớp đang hoạt động"
        />
        <StatCard
          icon={AlertTriangle}
          tone="warning"
          value={kpi.incomplete}
          label="Lớp thiếu dữ liệu"
          hint="Chưa có lịch hoặc chưa gán giáo viên"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="class-search" className="mb-1 block text-xs font-semibold text-neutral-500">
            Tìm kiếm
          </label>
          <SearchInput
            id="class-search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm theo tên lớp hoặc khóa học"
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

      <DataListPanel className="rounded-card border border-neutral-200 bg-white">
        <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold text-neutral-900">Danh sách lớp học</h2>
          <p className="mt-1 text-sm text-neutral-500">{filtered.length} lớp phù hợp bộ lọc</p>
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
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-neutral-50">
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th scope="col" className="px-4 py-3">
                      Lớp học
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Giáo viên
                    </th>
                    <th scope="col" className="px-4 py-3 text-center">
                      Sĩ số
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Lịch &amp; địa điểm
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
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
                      <tr key={klass.id} className="transition hover:bg-neutral-50">
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-center font-medium tabular-nums text-neutral-800">
                          {klass.studentIds.length}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {klass.scheduleText || <span className="text-xs font-semibold text-warning-700">Chưa có lịch</span>}
                          {klass.location && <span className="block text-xs text-neutral-400">{klass.location}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={STATUS_TONE[klass.status]}>{STATUS_LABEL[klass.status]}</StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(klass)}
                              className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                            >
                              Sửa
                            </button>
                            )}
                            {canDelete && klass.status !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() => onDelete?.(klass)}
                                className="min-h-touch rounded-input border border-danger-200 bg-danger-50 px-3 text-xs font-medium text-danger-700 hover:bg-danger-100"
                              >
                                Xóa
                              </button>
                            )}
                            <Link
                              to={sessionsForClassPath(klass.id)}
                              className="flex min-h-touch items-center rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                            >
                              Xem lịch
                            </Link>
                            <Link
                              to={classDetailPath(klass.id)}
                              className="flex min-h-touch items-center rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                            >
                              Quản lý học sinh
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
