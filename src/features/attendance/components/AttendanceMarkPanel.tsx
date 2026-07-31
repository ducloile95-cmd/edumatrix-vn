import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  GraduationCap,
  MapPin,
  Save,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterField, FilterSelect } from "@/components/ui/FilterToolbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getClass } from "@/services/firestore/classes";
import { writeAuditLog } from "@/services/firestore/auditLog";
import { listCourses } from "@/services/firestore/courses";
import { listStudents } from "@/services/firestore/students";
import { listSessions, listSessionsByClass } from "@/services/firestore/sessions";
import {
  listAttendanceBySession,
  listAttendanceByStudents,
  saveAttendance,
  type AttendanceEntry,
} from "@/services/firestore/attendance";
import type { AttendanceDoc, AttendanceStatus } from "@/types/academic";

interface AttendanceMarkPanelProps {
  presetSessionId?: string;
}

const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
  shortLabel: string;
  activeClass: string;
}> = [
  { value: "present", label: "Có mặt", shortLabel: "Có mặt", activeClass: "border-success-500 bg-success-50 text-success-700" },
  { value: "late", label: "Đi muộn", shortLabel: "Muộn", activeClass: "border-warning-500 bg-warning-50 text-warning-700" },
  { value: "excused", label: "Vắng có phép", shortLabel: "Có phép", activeClass: "border-primary-500 bg-primary-50 text-primary-700" },
  { value: "absent", label: "Vắng không phép", shortLabel: "Vắng", activeClass: "border-danger-500 bg-danger-50 text-danger-700" },
];

function formatBirthDate(value: string) {
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : "Chưa cập nhật";
}

function getAttendanceInsight(history: AttendanceDoc[]) {
  if (history.length === 0) return { rate: null, label: "Chưa có dữ liệu", tone: "bg-neutral-100 text-neutral-600", absent: 0, late: 0 };
  const attended = history.filter((item) => item.status !== "absent").length;
  const rate = Math.round((attended / history.length) * 100);
  const label = rate >= 90 ? "Chuyên cần tốt" : rate >= 75 ? "Cần theo dõi" : "Cần chú ý";
  const tone = rate >= 90 ? "bg-success-50 text-success-700" : rate >= 75 ? "bg-warning-50 text-warning-700" : "bg-danger-50 text-danger-700";
  return {
    rate,
    label,
    tone,
    absent: history.filter((item) => item.status === "absent").length,
    late: history.filter((item) => item.status === "late").length,
  };
}

export function AttendanceMarkPanel({ presetSessionId }: AttendanceMarkPanelProps) {
  const { firebaseUser, role } = useAuth();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(presetSessionId ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">("all");
  const [entries, setEntries] = useState<Record<string, AttendanceEntry>>({});
  const [baselineEntries, setBaselineEntries] = useState<Record<string, AttendanceEntry>>({});
  const hydratedSessionRef = useRef("");

  const dirtyCount = useMemo(() => Object.values(entries).filter((entry) => {
    const baseline = baselineEntries[entry.studentId];
    return !baseline || baseline.status !== entry.status || baseline.note !== entry.note;
  }).length, [baselineEntries, entries]);

  useEffect(() => {
    if (!presetSessionId || presetSessionId === sessionId) return;
    if (dirtyCount > 0 && !window.confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi và chuyển buổi học?")) return;
    hydratedSessionRef.current = "";
    setEntries({});
    setBaselineEntries({});
    setSessionId(presetSessionId);
  }, [dirtyCount, presetSessionId, sessionId]);

  const sessions = useQuery({
    queryKey: ["attendance-sessions"],
    queryFn: () => listSessions(subDays(new Date(), 30), addDays(new Date(), 60)),
  });
  const selectedSession = sessions.data?.find((item) => item.id === sessionId);
  const klass = useQuery({
    queryKey: ["class", selectedSession?.classId],
    queryFn: () => getClass(selectedSession?.classId ?? ""),
    enabled: !!selectedSession,
  });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const existing = useQuery({
    queryKey: ["attendance", sessionId],
    queryFn: () => listAttendanceBySession(sessionId, selectedSession?.classId ?? ""),
    enabled: !!sessionId && !!selectedSession,
  });
  const course = courses.data?.find((item) => item.id === klass.data?.courseId);
  const classStudents = useMemo(
    () => students.data?.filter((student) => klass.data?.studentIds.includes(student.id)) ?? [],
    [students.data, klass.data],
  );
  const history = useQuery({
    queryKey: ["attendance-student-history", classStudents.map((student) => student.id).join(",")],
    queryFn: () => listAttendanceByStudents(classStudents.map((student) => student.id)),
    enabled: classStudents.length > 0,
  });
  const classSessions = useQuery({
    queryKey: ["attendance-class-sessions", klass.data?.id, course?.startDate.toMillis(), course?.endDate.toMillis()],
    queryFn: () => listSessionsByClass(klass.data?.id ?? "", course!.startDate.toDate(), course!.endDate.toDate(), 300),
    enabled: !!klass.data && !!course,
  });

  useEffect(() => {
    if (!sessionId || !classStudents.length || existing.isLoading || hydratedSessionRef.current === sessionId) return;
    const nextEntries = Object.fromEntries(classStudents.map((student) => {
      const saved = existing.data?.find((item) => item.studentId === student.id);
      return [student.id, { studentId: student.id, status: saved?.status ?? "present", note: saved?.note ?? "" }];
    }));
    hydratedSessionRef.current = sessionId;
    setEntries(nextEntries);
    setBaselineEntries(nextEntries);
  }, [sessionId, classStudents, existing.data, existing.isLoading]);

  const mutation = useMutation({
    mutationFn: () => saveAttendance(sessionId, selectedSession?.classId ?? "", Object.values(entries), firebaseUser?.uid ?? "unknown"),
    onSuccess: () => {
      setBaselineEntries(entries);
      if (role === "admin" && firebaseUser) {
        void writeAuditLog(firebaseUser, "attendance_adjusted", "attendance_session", sessionId, {
          classId: selectedSession?.classId ?? "",
          changedStudents: String(dirtyCount),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-student-history"] });
    },
  });

  const updateEntry = (studentId: string, changes: Partial<AttendanceEntry>) => {
    mutation.reset();
    setEntries((current) => ({
      ...current,
      [studentId]: {
        studentId,
        status: current[studentId]?.status ?? "present",
        note: current[studentId]?.note ?? "",
        ...changes,
      },
    }));
  };

  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const visibleStudents = classStudents.filter((student) => {
    const matchesSearch = `${student.fullName} ${student.studentCode}`.toLocaleLowerCase("vi").includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || entries[student.id]?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const counts = STATUS_OPTIONS.reduce<Record<AttendanceStatus, number>>((result, item) => {
    result[item.value] = Object.values(entries).filter((entry) => entry.status === item.value).length;
    return result;
  }, { present: 0, absent: 0, late: 0, excused: 0 });
  const completedSessions = classSessions.data?.filter((item) => item.status !== "cancelled" && item.endAt.toMillis() < Date.now()).length ?? 0;
  const remainingSessions = classSessions.data
    ? classSessions.data.filter((item) => item.status !== "cancelled" && item.endAt.toMillis() >= Date.now()).length
    : Math.max(0, (course?.totalSessions ?? klass.data?.recurrence?.sessionCount ?? 0) - completedSessions);
  const isLoadingDetails = klass.isLoading || students.isLoading || existing.isLoading || courses.isLoading;

  const changeSession = (nextSessionId: string) => {
    if (dirtyCount > 0 && !window.confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi và chuyển buổi học?")) return;
    mutation.reset();
    hydratedSessionRef.current = "";
    setEntries({});
    setBaselineEntries({});
    setSessionId(nextSessionId);
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden self-start overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)] xl:sticky xl:top-4 xl:block">
        <div className="border-b border-neutral-100 p-4">
          <h2 className="text-base font-bold text-neutral-900">Buổi học</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {role === "admin" ? "Toàn bộ lớp trong 30 ngày gần đây" : "Các lớp được phân công"}
          </p>
        </div>
        <div className="max-h-[calc(100dvh-13rem)] space-y-1 overflow-y-auto p-2">
          {sessions.data?.map((session) => {
            const active = session.id === sessionId;
            const ended = session.endAt.toMillis() < Date.now();
            const running = session.startAt.toMillis() <= Date.now() && !ended;
            return (
              <button
                key={session.id}
                type="button"
                aria-pressed={active}
                onClick={() => changeSession(session.id)}
                className={`w-full rounded-input border p-3 text-left transition ${
                  active ? "border-primary-200 bg-primary-50" : "border-transparent hover:border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold tabular-nums text-neutral-900">{format(session.startAt.toDate(), "dd/MM · HH:mm")}</span>
                  <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${ended ? "bg-neutral-100 text-neutral-600" : running ? "bg-success-50 text-success-700" : "bg-primary-50 text-primary-700"}`}>
                    {ended ? "Đã kết thúc" : running ? "Đang diễn ra" : "Sắp tới"}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-neutral-800">{session.title}</span>
                <span className="mt-1 block truncate text-xs text-neutral-500">{session.location || "Chưa cập nhật phòng"}</span>
              </button>
            );
          })}
          {!sessions.isLoading && sessions.data?.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-neutral-500">Không có buổi học trong khoảng đang xem.</p>
          )}
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
      <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
        <div className="grid gap-4 border-b border-neutral-100 bg-neutral-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end sm:p-5 xl:hidden">
          <div>
            <label htmlFor="attendance-session" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
              Buổi học cần điểm danh
            </label>
            <select
              id="attendance-session"
              value={sessionId}
              onChange={(event) => changeSession(event.target.value)}
              className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Chọn buổi học</option>
              {sessions.data?.map((session) => (
                <option key={session.id} value={session.id}>
                  {format(session.startAt.toDate(), "dd/MM/yyyy HH:mm")} - {session.title}
                </option>
              ))}
            </select>
          </div>
          {sessionId && (
            <button
              type="button"
              onClick={() => {
                mutation.reset();
                setEntries((current) => Object.fromEntries(classStudents.map((student) => [student.id, { ...current[student.id], studentId: student.id, status: "present", note: current[student.id]?.note ?? "" }])));
              }}
              className="inline-flex min-h-touch items-center justify-center gap-2 rounded-input border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100"
            >
              <CheckCheck size={17} /> Tất cả có mặt
            </button>
          )}
        </div>

        {!sessionId && !sessions.isLoading && (
          <div className="p-6 sm:p-8">
            <EmptyState title="Chọn một buổi học để bắt đầu điểm danh" />
          </div>
        )}

        {sessionId && isLoadingDetails && <div className="p-5"><LoadingSkeleton rows={5} /></div>}

        {sessionId && selectedSession && klass.data && !isLoadingDetails && (
          <>
            {role === "admin" && (
              <p className="border-b border-warning-100 bg-warning-50 px-4 py-2.5 text-xs font-medium text-warning-700">
                Bạn đang thao tác với quyền Admin. Mọi thay đổi sẽ được lưu dưới dạng điều chỉnh quản trị.
              </p>
            )}
            <div className="grid grid-cols-2 gap-px bg-neutral-200 xl:grid-cols-5">
              <InfoCell icon={GraduationCap} label="Lớp học" value={klass.data.name} detail={`${classStudents.length} học sinh`} />
              <InfoCell icon={CalendarDays} label="Khóa học" value={course?.name ?? "Chưa liên kết khóa học"} detail={course ? `${course.totalSessions} buổi toàn khóa` : "Cần bổ sung dữ liệu"} />
              <InfoCell icon={Clock3} label="Thời gian" value={format(selectedSession.startAt.toDate(), "EEEE, dd/MM", { locale: vi })} detail={`${format(selectedSession.startAt.toDate(), "HH:mm")} - ${format(selectedSession.endAt.toDate(), "HH:mm")}`} />
              <InfoCell icon={MapPin} label="Địa điểm" value={selectedSession.location || klass.data.location || "Chưa cập nhật"} detail={selectedSession.title} />
              <InfoCell icon={Users} label="Số buổi còn lại" value={`${remainingSessions} buổi`} detail={`Đã hoàn thành ${completedSessions} buổi`} accent />
            </div>
          </>
        )}
      </section>

      {sessionId && classStudents.length === 0 && !students.isLoading && <EmptyState title="Lớp chưa có học sinh" />}

      {classStudents.length > 0 && (
        <section className="rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="grid gap-3 border-b border-neutral-100 p-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,.45fr)_auto_auto] md:items-end sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Danh sách học sinh</h2>
              <p className="mt-1 text-xs text-neutral-500">Đã xác nhận {Object.keys(entries).length}/{classStudents.length} học sinh</p>
            </div>
            <FilterField label="Tìm kiếm" htmlFor="attendance-student-search">
              <SearchInput
                id="attendance-student-search"
                value={search}
                onChange={setSearch}
                placeholder="Tìm tên hoặc mã học sinh"
              />
            </FilterField>
            <FilterSelect
              id="attendance-status-filter"
              label="Trạng thái"
              value={statusFilter}
              options={[{ value: "all", label: "Tất cả trạng thái" }, ...STATUS_OPTIONS]}
              onChange={(value) => setStatusFilter(value as AttendanceStatus | "all")}
            />
            <button
              type="button"
              onClick={() => {
                mutation.reset();
                setEntries((current) => Object.fromEntries(classStudents.map((student) => [student.id, {
                  ...current[student.id],
                  studentId: student.id,
                  status: "present",
                  note: current[student.id]?.note ?? "",
                }])));
              }}
              className="hidden min-h-touch items-center justify-center gap-2 rounded-input border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100 md:inline-flex"
            >
              <CheckCheck size={17} /> Tất cả có mặt
            </button>
          </div>

          <div className="hidden grid-cols-[minmax(190px,1.15fr)_minmax(300px,1.5fr)_minmax(170px,.8fr)_minmax(180px,1fr)] gap-4 border-b border-neutral-100 bg-neutral-50 px-5 py-2.5 text-2xs font-bold uppercase tracking-[0.1em] text-neutral-500 lg:grid">
            <span>Học sinh</span><span>Tình trạng điểm danh</span><span>Đánh giá chuyên cần</span><span>Ghi chú</span>
          </div>

          <ul className="divide-y divide-neutral-100 pb-36 md:pb-0">
            {visibleStudents.map((student) => {
              const studentHistory = history.data?.filter((item) => item.studentId === student.id) ?? [];
              const insight = getAttendanceInsight(studentHistory);
              return (
                <li key={student.id} className="grid gap-3 px-3 py-3 transition hover:bg-neutral-50/70 sm:px-4 sm:py-4 lg:grid-cols-[minmax(190px,1.15fr)_minmax(300px,1.5fr)_minmax(170px,.8fr)_minmax(180px,1fr)] lg:items-center lg:gap-4 lg:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                      {student.fullName.trim().split(/\s+/).slice(-1)[0]?.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-900">{student.fullName}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{student.studentCode} · {formatBirthDate(student.dateOfBirth)}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-2xs font-semibold ${student.status === "active" ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-600"}`}>
                        {student.status === "active" ? "Đang học" : "Tạm dừng"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-2xs font-bold uppercase tracking-[0.08em] text-neutral-500 lg:hidden">Tình trạng điểm danh</p>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {STATUS_OPTIONS.map((option) => {
                        const active = (entries[student.id]?.status ?? "present") === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={active}
                            aria-label={`${option.label}: ${student.fullName}`}
                            onClick={() => updateEntry(student.id, { status: option.value })}
                            className={`relative min-h-touch rounded-input border px-2 text-xs font-semibold transition ${active ? option.activeClass : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"}`}
                          >
                            {active && <Check size={12} className="absolute right-1.5 top-1.5" />}
                            {option.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-2xs font-bold uppercase tracking-[0.08em] text-neutral-500 lg:hidden">Đánh giá chuyên cần</p>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${insight.tone}`}>
                        {insight.rate === null ? "Mới" : `${insight.rate}%`}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-neutral-800">{insight.label}</p>
                        <p className="mt-0.5 text-2xs text-neutral-500">Vắng {insight.absent} · Muộn {insight.late}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`attendance-note-${student.id}`} className="mb-2 block text-2xs font-bold uppercase tracking-[0.08em] text-neutral-500 lg:hidden">Ghi chú</label>
                    <input
                      id={`attendance-note-${student.id}`}
                      placeholder="Nhập nhận xét ngắn"
                      value={entries[student.id]?.note ?? ""}
                      onChange={(event) => updateEntry(student.id, { note: event.target.value })}
                      className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {visibleStudents.length === 0 && <div className="p-6"><EmptyState title="Không tìm thấy học sinh phù hợp" /></div>}

          <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 border-t border-neutral-200 bg-white/95 p-3 shadow-[0_-10px_24px_rgba(28,26,21,.08)] backdrop-blur sm:p-4 md:relative md:inset-auto md:flex-row md:items-center md:justify-between md:p-5">
            {mutation.isError && <p role="alert" className="absolute inset-x-0 bottom-full border-t border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700 shadow-[0_-8px_20px_rgba(28,26,21,.06)]">Lưu thất bại. Dữ liệu vẫn còn trên màn hình, hãy kiểm tra kết nối và thử lại.</p>}
            {mutation.isSuccess && <p role="status" aria-live="polite" className="absolute inset-x-0 bottom-full border-t border-success-100 bg-success-50 px-4 py-3 text-sm font-medium text-success-700 shadow-[0_-8px_20px_rgba(28,26,21,.06)]">Đã lưu điểm danh và cập nhật đánh giá chuyên cần.</p>}
            <div aria-live="polite" className="grid w-full grid-cols-2 gap-2 text-xs font-semibold sm:flex sm:w-auto sm:flex-wrap">
              {STATUS_OPTIONS.map((item) => <span key={item.value} className={`rounded-full px-2.5 py-1 ${item.activeClass}`}>{item.shortLabel}: {counts[item.value]}</span>)}
            </div>
            <div className="flex w-full items-center gap-2 md:w-auto">
              {dirtyCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    mutation.reset();
                    setEntries(baselineEntries);
                  }}
                  className="min-h-touch rounded-input border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Hoàn tác
                </button>
              )}
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || Object.keys(entries).length === 0 || dirtyCount === 0}
                className="inline-flex min-h-touch w-full flex-1 items-center justify-center gap-2 rounded-input bg-primary-500 px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(51,102,240,.22)] transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:flex-none"
              >
                <Save size={17} /> {mutation.isPending ? "Đang lưu..." : role === "admin" ? `Lưu điều chỉnh (${dirtyCount})` : `Lưu điểm danh (${classStudents.length})`}
              </button>
            </div>
          </div>

        </section>
      )}
      </div>
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={`min-w-0 p-3 sm:p-5 ${accent ? "col-span-2 bg-primary-500 text-white xl:col-span-1" : "bg-white"}`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className={accent ? "text-primary-100" : "text-primary-500"} />
        <p className={`text-2xs font-bold uppercase tracking-[0.1em] ${accent ? "text-primary-100" : "text-neutral-500"}`}>{label}</p>
      </div>
      <p className={`mt-2 truncate text-sm font-bold ${accent ? "text-white" : "text-neutral-900"}`}>{value}</p>
      <p className={`mt-1 truncate text-xs ${accent ? "text-primary-100" : "text-neutral-500"}`}>{detail}</p>
    </div>
  );
}
