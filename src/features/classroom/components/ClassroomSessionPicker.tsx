import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, format, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterField, FilterSelect } from "@/components/ui/FilterToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { USER_ROLES } from "@/constants/roles";
import { classDetailPath, classroomSessionPath } from "@/constants/routes";
import { isActionableTodaySession } from "@/features/classroom/utils/sessionTiming";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSessions } from "@/services/firestore/sessions";
import { listUsersByRole } from "@/services/firestore/users";
import type { ClassStatus } from "@/types/academic";

export function ClassroomSessionPicker() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");
  const today = useMemo(() => new Date(), []);
  const sessions = useQuery({
    queryKey: ["classroom", "sessions", format(today, "yyyy-MM-dd")],
    queryFn: () => listSessions(startOfDay(today), endOfDay(today)),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const classes = useQuery({
    queryKey: ["classes"],
    queryFn: listClasses,
    staleTime: 5 * 60 * 1000,
  });
  const courses = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
    staleTime: 5 * 60 * 1000,
  });
  const teachers = useQuery({
    queryKey: ["users", "teacher"],
    queryFn: () => listUsersByRole(USER_ROLES.TEACHER),
    staleTime: 5 * 60 * 1000,
  });
  const courseById = useMemo(
    () => new Map((courses.data ?? []).map((course) => [course.id, course.name])),
    [courses.data],
  );
  const teacherById = useMemo(
    () => new Map((teachers.data ?? []).map((teacher) => [teacher.uid, teacher.displayName])),
    [teachers.data],
  );
  const classById = useMemo(
    () => new Map((classes.data ?? []).map((klass) => [klass.id, klass])),
    [classes.data],
  );
  const actionableSessions = useMemo(
    () => (sessions.data ?? []).filter((session) => isActionableTodaySession({
      startAt: session.startAt.toDate(),
      endAt: session.endAt.toDate(),
      status: session.status,
    }, today)),
    [sessions.data, today],
  );
  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return (classes.data ?? []).filter((klass) => {
      const teacherNames = klass.teacherIds.map((id) => teacherById.get(id) ?? "").join(" ");
      const searchable = `${klass.name} ${courseById.get(klass.courseId) ?? ""} ${teacherNames}`.toLocaleLowerCase("vi");
      return (statusFilter === "all" || klass.status === statusFilter) && (!keyword || searchable.includes(keyword));
    });
  }, [classes.data, courseById, search, statusFilter, teacherById]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-700">Ưu tiên hôm nay</p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">Lớp học hôm nay</h2>
          </div>
          <span className="inline-flex min-h-10 items-center gap-2 self-start rounded-input border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-neutral-700 sm:self-auto">
            <CalendarDays size={16} aria-hidden="true" />
            {format(today, "EEEE, dd/MM/yyyy", { locale: vi })}
          </span>
        </div>

        {sessions.isLoading ? (
          <div className="p-5"><LoadingSkeleton rows={2} /></div>
        ) : sessions.isError ? (
          <div className="p-5"><ErrorState message="Không tải được lớp học hôm nay." onRetry={() => sessions.refetch()} /></div>
        ) : actionableSessions.length ? (
          <ul className="grid gap-3 p-4 lg:grid-cols-2">
            {actionableSessions.map((session) => {
              const klass = classById.get(session.classId);
              const isLive = session.startAt.toDate() <= today;
              return (
                <li key={session.id} className="rounded-card border border-neutral-200 p-4 transition hover:border-primary-200 hover:bg-primary-50/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <StatusBadge tone={isLive ? "success" : "warning"}>{isLive ? "Đang diễn ra" : "Sắp diễn ra"}</StatusBadge>
                    <strong className="text-lg font-black tabular-nums text-primary-700">
                      {format(session.startAt.toDate(), "HH:mm")} - {format(session.endAt.toDate(), "HH:mm")}
                    </strong>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-neutral-950">{klass?.name ?? session.title}</h3>
                  {klass?.name && <p className="mt-1 text-sm text-neutral-600">{session.title}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{session.location || "Chưa có địa điểm"}</span>
                    <span className="inline-flex items-center gap-1.5"><Users size={14} aria-hidden="true" />{klass?.studentIds.length ?? 0} học sinh</span>
                  </div>
                  <Link to={classroomSessionPath(session.id)} className="mt-4 inline-flex min-h-touch w-full items-center justify-center rounded-input bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
                    Mở tương tác
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-6"><EmptyState title="Không còn buổi học cần thao tác hôm nay" description="Buổi đã kết thúc hoặc bị hủy sẽ không hiển thị tại khu vực ưu tiên." /></div>
        )}
      </section>

      <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
        <div className="border-b border-neutral-100 p-5">
          <h2 className="text-xl font-bold text-neutral-900">Danh sách lớp học</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_190px]">
            <FilterField label="Tìm kiếm" htmlFor="classroom-class-search">
              <SearchInput id="classroom-class-search" value={search} onChange={setSearch} placeholder="Tên lớp, khóa học hoặc giáo viên" />
            </FilterField>
            <FilterSelect
              id="classroom-status-filter"
              label="Trạng thái"
              value={statusFilter}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "active", label: "Đang hoạt động" },
                { value: "completed", label: "Đã kết thúc" },
                { value: "cancelled", label: "Đã hủy" },
              ]}
              onChange={(value) => setStatusFilter(value as ClassStatus | "all")}
            />
          </div>
        </div>

        {classes.isLoading ? (
          <div className="p-5"><LoadingSkeleton rows={5} /></div>
        ) : classes.isError ? (
          <div className="p-5"><ErrorState message="Không tải được danh sách lớp học." onRetry={() => classes.refetch()} /></div>
        ) : filteredClasses.length ? (
          <>
            <div className="grid gap-3 bg-neutral-50 p-3 md:block md:bg-white md:p-0" role="region" aria-label="Danh sách lớp học">
              <table className="block w-full border-collapse text-sm md:table">
                <thead className="hidden bg-neutral-50 md:table-header-group">
                  <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th scope="col" className="px-4 py-3">Lớp học</th>
                    <th scope="col" className="px-4 py-3">Giáo viên</th>
                    <th scope="col" className="px-4 py-3">Lịch và địa điểm</th>
                    <th scope="col" className="px-4 py-3 text-center">Sĩ số</th>
                    <th scope="col" className="px-4 py-3">Trạng thái</th>
                    <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-neutral-100">
                  {filteredClasses.map((klass) => {
                    const teacherNames = klass.teacherIds.map((id) => teacherById.get(id)).filter((name): name is string => !!name);
                    const status = CLASS_STATUS_META[klass.status];
                    return (
                      <tr key={klass.id} className="block rounded-card border border-neutral-200 bg-white p-3 md:table-row md:border-0 md:p-0 md:hover:bg-neutral-50">
                        <td className="flex items-start justify-between gap-4 py-2 md:table-cell md:px-4 md:py-3">
                          <span className="text-xs font-semibold text-neutral-500 md:hidden">Lớp học</span>
                          <div className="text-right md:text-left">
                            <Link to={classDetailPath(klass.id)} className="font-bold text-primary-700 hover:underline">{klass.name}</Link>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              {courseById.get(klass.courseId) ?? (courses.isLoading ? "Đang tải khóa học..." : "Không tải được tên khóa học")}
                            </p>
                          </div>
                        </td>
                        <td className="flex justify-between gap-4 border-t border-neutral-100 py-2 md:table-cell md:border-0 md:px-4 md:py-3">
                          <span className="text-xs font-semibold text-neutral-500 md:hidden">Giáo viên</span>
                          <span className="text-right text-neutral-700 md:text-left">
                            {teacherNames.join(", ") || (klass.teacherIds.length ? (teachers.isLoading ? "Đang tải giáo viên..." : "Không tải được tên giáo viên") : "Chưa phân công")}
                          </span>
                        </td>
                        <td className="flex justify-between gap-4 border-t border-neutral-100 py-2 md:table-cell md:border-0 md:px-4 md:py-3">
                          <span className="text-xs font-semibold text-neutral-500 md:hidden">Lịch học</span>
                          <span className="text-right text-neutral-700 md:text-left">{klass.scheduleText || "Chưa có lịch"}{klass.location && <small className="block text-neutral-500">{klass.location}</small>}</span>
                        </td>
                        <td className="flex justify-between gap-4 border-t border-neutral-100 py-2 md:table-cell md:border-0 md:px-4 md:py-3 md:text-center">
                          <span className="text-xs font-semibold text-neutral-500 md:hidden">Sĩ số</span>
                          <span className="font-semibold tabular-nums text-neutral-800">{klass.studentIds.length}</span>
                        </td>
                        <td className="flex items-center justify-between gap-4 border-t border-neutral-100 py-2 md:table-cell md:border-0 md:px-4 md:py-3">
                          <span className="text-xs font-semibold text-neutral-500 md:hidden">Trạng thái</span>
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        </td>
                        <td className="border-t border-neutral-100 pt-3 md:table-cell md:border-0 md:px-4 md:py-3 md:text-right">
                          <Link to={classDetailPath(klass.id)} className="inline-flex min-h-touch w-full items-center justify-center rounded-input border border-neutral-300 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 md:w-auto">
                            Xem lớp
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">{filteredClasses.length} lớp phù hợp bộ lọc.</p>
          </>
        ) : (
          <div className="p-6"><EmptyState title="Không tìm thấy lớp học phù hợp" /></div>
        )}
      </section>
    </div>
  );
}

const CLASS_STATUS_META: Record<ClassStatus, { label: string; tone: "success" | "neutral" | "danger" }> = {
  active: { label: "Đang hoạt động", tone: "success" },
  completed: { label: "Đã kết thúc", tone: "neutral" },
  cancelled: { label: "Đã hủy", tone: "danger" },
};
