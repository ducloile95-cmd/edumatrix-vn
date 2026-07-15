import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import type { ClassStatus, SessionDoc } from "@/types/academic";

interface ClassScheduleListProps {
  onViewOnTimetable: (classId: string, className: string) => void;
  /** Buoi hoc dang tai trong Timetable hien tai (khong goi them truy van moi) - dung de suy ra "Buoi tiep theo" neu co. */
  loadedSessions?: (SessionDoc & { id: string })[];
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

export function ClassScheduleList({ onViewOnTimetable, loadedSessions }: ClassScheduleListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");

  // Tai dung listClasses()/listCourses()/listSubjects()/listUsersByRole() - dung queryKey voi
  // ClassesList/ClassForm/CourseForm nen chia se cache, khong them loai truy van Firestore moi.
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses, staleTime: 60_000 });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: listSubjects, staleTime: 60_000 });
  const teachersQuery = useQuery({
    queryKey: ["users", "teacher"],
    queryFn: () => listUsersByRole(USER_ROLES.TEACHER),
    staleTime: 60_000,
  });

  const courseById = useMemo(() => new Map((coursesQuery.data ?? []).map((c) => [c.id, c])), [coursesQuery.data]);
  const subjectById = useMemo(() => new Map((subjectsQuery.data ?? []).map((s) => [s.id, s])), [subjectsQuery.data]);
  const teacherById = useMemo(() => new Map((teachersQuery.data ?? []).map((t) => [t.uid, t])), [teachersQuery.data]);

  const nextSessionByClass = useMemo(() => {
    const map = new Map<string, Date>();
    const now = new Date();
    (loadedSessions ?? []).forEach((session) => {
      if (session.status === "cancelled") return;
      const start = session.startAt.toDate();
      if (start < now) return;
      const current = map.get(session.classId);
      if (!current || start < current) map.set(session.classId, start);
    });
    return map;
  }, [loadedSessions]);

  const filtered = useMemo(() => {
    const list = classesQuery.data ?? [];
    const keyword = search.trim().toLowerCase();
    return list.filter((klass) => {
      const course = courseById.get(klass.courseId);
      const matchesKeyword =
        !keyword ||
        klass.name.toLowerCase().includes(keyword) ||
        (course?.name.toLowerCase().includes(keyword) ?? false);
      const matchesStatus = statusFilter === "all" || klass.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [classesQuery.data, courseById, search, statusFilter]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  const isLoading = classesQuery.isLoading;
  const isError = classesQuery.isError;

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError) return <ErrorState message="Không tải được danh sách lớp học." onRetry={() => classesQuery.refetch()} />;
  if (!classesQuery.data || classesQuery.data.length === 0) {
    return <EmptyState title="Chưa có lớp học nào" description="Tạo lớp học ở trang Lớp học." />;
  }

  return (
    <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Danh sách lớp học</h2>
            <p className="mt-1 text-sm text-neutral-500">{filtered.length} lớp — gắn liền Khóa học &amp; Môn học</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="class-schedule-search" className="mb-1 block text-xs font-semibold text-neutral-500">
              Tìm kiếm
            </label>
            <SearchInput
              id="class-schedule-search"
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
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 sm:px-5">
          <EmptyState title="Không tìm thấy lớp học phù hợp" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th scope="col" className="px-4 py-3">Lớp học</th>
                  <th scope="col" className="px-4 py-3">Khóa học</th>
                  <th scope="col" className="px-4 py-3">Môn học</th>
                  <th scope="col" className="px-4 py-3">Giáo viên</th>
                  <th scope="col" className="px-4 py-3">Lịch học</th>
                  <th scope="col" className="px-4 py-3">Buổi tiếp theo</th>
                  <th scope="col" className="px-4 py-3">Trạng thái</th>
                  <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
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
                  const nextSession = nextSessionByClass.get(klass.id);

                  return (
                    <tr key={klass.id} className="transition hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{klass.name}</td>
                      <td className="px-4 py-3 text-neutral-700">{course?.name ?? "Chưa gắn khóa học"}</td>
                      <td className="px-4 py-3">
                        {subjectNames.length === 0 ? (
                          <span className="text-xs text-neutral-400">—</span>
                        ) : (
                          subjectNames.map((name) => (
                            <span key={name} className="mr-1 mt-0.5 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                              {name}
                            </span>
                          ))
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{teacherNames.join(", ") || "Chưa gán"}</td>
                      <td className="px-4 py-3 text-neutral-600">{klass.scheduleText || "Chưa có lịch"}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {nextSession ? format(nextSession, "dd/MM HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={STATUS_TONE[klass.status]}>{STATUS_LABEL[klass.status]}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onViewOnTimetable(klass.id, klass.name)}
                          className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                        >
                          Xem lịch
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4 sm:px-5">
            <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} itemLabel="lớp" />
          </div>
        </>
      )}
    </section>
  );
}
