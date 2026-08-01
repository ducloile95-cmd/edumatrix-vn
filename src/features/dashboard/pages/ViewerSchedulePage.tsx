import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { addDays, addWeeks, endOfWeek, format, isSameDay, startOfWeek, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SessionDetailModal } from "@/features/sessions/components/SessionDetailModal";
import type { TimetableSession } from "@/features/sessions/components/TimetableGrid";
import { ViewerStudentSwitcher } from "@/features/students/components/ViewerStudentSwitcher";
import { useViewerStudentSelection } from "@/features/students/hooks/useViewerStudentSelection";
import { listAccessibleClassesByIds } from "@/services/firestore/classes";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getStudent } from "@/services/firestore/students";
import type { SessionStatus } from "@/types/academic";

const WINDOW_PAST_DAYS = 14;
const WINDOW_FUTURE_DAYS = 60;

const STATUS_META: Record<
  SessionStatus,
  { label: string; tone: "info" | "warning" | "danger" | "success"; rail: string }
> = {
  scheduled: { label: "Đã lên lịch", tone: "info", rail: "bg-primary-500" },
  rescheduled: { label: "Đã đổi lịch", tone: "warning", rail: "bg-warning-500" },
  cancelled: { label: "Đã hủy", tone: "danger", rail: "bg-danger-500" },
  completed: { label: "Đã học", tone: "success", rail: "bg-success-500" },
};

export default function ViewerSchedulePage() {
  const { userDoc } = useAuth();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);
  const today = useMemo(() => new Date(), []);

  const studentIds = userDoc?.studentIds ?? [];
  const studentQueries = useQueries({
    queries: studentIds.map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })),
  });
  const students = studentQueries.flatMap((query) => query.data ? [query.data] : []);
  const { selectedStudentId, selectStudent } = useViewerStudentSelection(students);
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const classIds = useMemo(() => selectedStudent?.currentClassIds ?? [], [selectedStudent]);

  const classes = useQuery({
    queryKey: ["viewer-classes", classIds],
    queryFn: () => listAccessibleClassesByIds(classIds),
    enabled: !!selectedStudent,
  });
  const accessibleClasses = useMemo(() => classes.data ?? [], [classes.data]);
  const accessibleClassIds = accessibleClasses.map((klass) => klass.id);
  const classById = useMemo(
    () => new Map(accessibleClasses.map((klass) => [klass.id, klass])),
    [accessibleClasses],
  );

  const windowFrom = useMemo(() => subDays(today, WINDOW_PAST_DAYS), [today]);
  const windowTo = useMemo(() => addDays(today, WINDOW_FUTURE_DAYS), [today]);
  const sessionQueries = useQueries({
    queries: accessibleClassIds.map((id) => ({
      queryKey: ["viewer-sessions", id],
      queryFn: () => listSessionsByClass(id, windowFrom, windowTo),
    })),
  });

  const range = useMemo(
    () => ({
      from: startOfWeek(anchor, { weekStartsOn: 1 }),
      to: endOfWeek(anchor, { weekStartsOn: 1 }),
    }),
    [anchor],
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(range.from, index)),
    [range.from],
  );
  const allSessions = useMemo<TimetableSession[]>(() => sessionQueries
    .flatMap((query) => query.data ?? [])
    .map((session) => ({
      ...session,
      className: classById.get(session.classId)?.name ?? session.title,
    }))
    .sort((left, right) => left.startAt.toMillis() - right.startAt.toMillis()), [classById, sessionQueries]);
  const weekSessions = useMemo(
    () => allSessions.filter((session) => {
      const start = session.startAt.toDate();
      return start >= range.from && start <= range.to;
    }),
    [allSessions, range.from, range.to],
  );
  const nextSession = allSessions.find(
    (session) => session.status !== "cancelled" && session.startAt.toMillis() >= today.getTime(),
  );
  const selectedDaySessions = weekSessions.filter(
    (session) => isSameDay(session.startAt.toDate(), selectedDay),
  );

  const isLoading = studentQueries.some((query) => query.isLoading)
    || classes.isLoading
    || sessionQueries.some((query) => query.isLoading);
  const firstError = studentQueries.find((query) => query.error)?.error
    ?? classes.error
    ?? sessionQueries.find((query) => query.error)?.error;

  const retry = () => {
    studentQueries.forEach((query) => query.refetch());
    classes.refetch();
    sessionQueries.forEach((query) => query.refetch());
  };

  const shiftWeek = (direction: -1 | 1) => {
    setAnchor((current) => addWeeks(current, direction));
    setSelectedDay((current) => addWeeks(current, direction));
  };

  const goToToday = () => {
    const now = new Date();
    setAnchor(now);
    setSelectedDay(now);
  };

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`viewer-day-${format(day, "yyyy-MM-dd")}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <>
      {isLoading && <LoadingSkeleton rows={5} />}
      {!isLoading && firstError && (
        <ErrorState message="Không thể tải lịch học. Vui lòng kiểm tra kết nối và thử lại." onRetry={retry} />
      )}
      {!isLoading && !firstError && !selectedStudent && (
        <EmptyState title="Chưa liên kết học sinh" description="Tài khoản phụ huynh cần được liên kết với học sinh để xem lịch học." />
      )}
      {!isLoading && !firstError && selectedStudent && (
        <div className="space-y-4 pb-5">
          <ViewerStudentSwitcher
            students={students}
            selectedStudentId={selectedStudent.id}
            onSelect={(studentId) => {
              selectStudent(studentId);
              goToToday();
            }}
          />

          <header>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Lịch học</h2>
            <p className="mt-1.5 text-sm text-neutral-500">Theo dõi buổi học và các thay đổi quan trọng trong tuần.</p>
          </header>

          {accessibleClasses.length === 0 ? (
            <EmptyState title="Chưa được phân lớp" description="Hồ sơ học sinh vẫn được lưu. Lịch học sẽ hiển thị sau khi học sinh được phân vào lớp." />
          ) : (
            <>
              <div className="lg:hidden">
                <NextSessionCard session={nextSession} onOpen={setSelectedSession} />
              </div>

              <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
            <WeekNavigator
              days={days}
              sessions={weekSessions}
              selectedDay={selectedDay}
              today={today}
              onSelect={selectDay}
              onPrevious={() => shiftWeek(-1)}
              onNext={() => shiftWeek(1)}
              onToday={goToToday}
            />

            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 px-3 py-4 sm:px-5">
                <div className="lg:hidden">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold capitalize text-neutral-900">
                      {format(selectedDay, "EEEE, dd/MM", { locale: vi })}
                    </h3>
                    <span className="text-xs font-semibold text-neutral-400">{selectedDaySessions.length} buổi học</span>
                  </div>
                  <DayAgenda
                    sessions={selectedDaySessions}
                    emptyMessage="Không có buổi học trong ngày này."
                    onOpen={setSelectedSession}
                  />
                </div>

                <div className="hidden lg:block">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900">Lịch trong tuần</h3>
                      <p className="mt-1 text-xs text-neutral-500">Các buổi học được sắp theo ngày và thời gian.</p>
                    </div>
                    <span className="text-xs font-semibold text-neutral-500">{weekSessions.length} buổi học</span>
                  </div>
                  {weekSessions.length === 0 ? (
                    <DayAgenda sessions={[]} emptyMessage="Tuần này chưa có lịch học." onOpen={setSelectedSession} />
                  ) : (
                    <div className="space-y-5">
                      {days.map((day) => {
                        const sessions = weekSessions.filter(
                          (session) => isSameDay(session.startAt.toDate(), day),
                        );
                        if (!sessions.length) return null;
                        return (
                          <section key={format(day, "yyyy-MM-dd")} id={`viewer-day-${format(day, "yyyy-MM-dd")}`}>
                            <div className="mb-2 flex items-center gap-2">
                              <h4 className="text-sm font-bold capitalize text-neutral-900">
                                {format(day, "EEEE, dd/MM", { locale: vi })}
                              </h4>
                              {isSameDay(day, today) && <StatusBadge tone="info">Hôm nay</StatusBadge>}
                            </div>
                            <div className="space-y-1 rounded-card bg-neutral-50 p-1.5">
                              {sessions.map((session) => (
                                <ScheduleRow key={session.id} session={session} onOpen={setSelectedSession} />
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="hidden border-l border-neutral-200 bg-neutral-50/70 p-4 lg:block">
                <div className="sticky top-4 space-y-4">
                  <NextSessionCard session={nextSession} onOpen={setSelectedSession} />
                  <section className="rounded-card border border-neutral-200 bg-white p-4">
                    <h3 className="text-sm font-bold text-neutral-900">Tóm tắt tuần</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-input bg-neutral-50 p-3">
                        <dt className="text-2xs font-semibold text-neutral-500">Tổng số buổi</dt>
                        <dd className="mt-1 text-xl font-extrabold tabular-nums text-neutral-900">{weekSessions.length}</dd>
                      </div>
                      <div className="rounded-input bg-warning-50 p-3">
                        <dt className="text-2xs font-semibold text-warning-700">Có thay đổi</dt>
                        <dd className="mt-1 text-xl font-extrabold tabular-nums text-warning-900">
                          {weekSessions.filter(
                            (session) => session.status === "rescheduled" || session.status === "cancelled",
                          ).length}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
              </aside>
            </div>
              </section>
            </>
          )}
        </div>
      )}

      <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} readOnly />
    </>
  );
}

function WeekNavigator({
  days,
  sessions,
  selectedDay,
  today,
  onSelect,
  onPrevious,
  onNext,
  onToday,
}: {
  days: Date[];
  sessions: TimetableSession[];
  selectedDay: Date;
  today: Date;
  onSelect: (day: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const currentWeek = days.some((day) => isSameDay(day, today));

  return (
    <header className="border-b border-neutral-200 px-3 py-3 sm:px-5 sm:py-4">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <button
          type="button"
          aria-label="Xem tuần trước"
          onClick={onPrevious}
          className="motion-control grid min-h-touch place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700"
        >
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold tabular-nums text-neutral-900">
            {format(days[0], "dd/MM")} - {format(days[6], "dd/MM/yyyy")}
          </p>
          <button
            type="button"
            disabled={currentWeek}
            onClick={onToday}
            className="mt-1 text-xs font-semibold text-primary-700 hover:underline disabled:text-neutral-400 disabled:no-underline"
          >
            {currentWeek ? "Tuần này" : "Về tuần này"}
          </button>
        </div>
        <button
          type="button"
          aria-label="Xem tuần sau"
          onClick={onNext}
          className="motion-control grid min-h-touch place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700"
        >
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>

      <div aria-label="Chọn ngày trong tuần" className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const count = sessions.filter((session) => isSameDay(session.startAt.toDate(), day)).length;
          const selected = isSameDay(day, selectedDay);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              type="button"
              aria-pressed={selected}
              aria-label={`${format(day, "EEEE, dd/MM", { locale: vi })}, ${count} buổi học`}
              onClick={() => onSelect(day)}
              className={`motion-control relative min-h-[58px] rounded-input border px-1 py-2 text-center ${
                selected
                  ? "border-primary-600 bg-primary-700 text-white shadow-[0_6px_16px_rgba(35,72,214,.2)]"
                  : isToday
                    ? "border-primary-200 bg-primary-50 text-primary-800"
                    : "border-transparent text-neutral-500 hover:border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <span className="block text-2xs font-bold uppercase">{format(day, "EEEEEE", { locale: vi })}</span>
              <span className="mt-1 block text-sm font-extrabold tabular-nums">{format(day, "dd")}</span>
              {count > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    selected ? "bg-white" : "bg-primary-500"
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}

function DayAgenda({
  sessions,
  emptyMessage,
  onOpen,
}: {
  sessions: TimetableSession[];
  emptyMessage: string;
  onOpen: (session: TimetableSession) => void;
}) {
  if (!sessions.length) {
    return (
      <div className="rounded-card border border-dashed border-neutral-300 px-5 py-10 text-center">
        <CalendarDays className="mx-auto text-neutral-300" size={30} aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-neutral-700">{emptyMessage}</p>
        <p className="mt-1 text-xs text-neutral-500">Chọn ngày có dấu chấm để xem lịch học.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <ScheduleRow key={session.id} session={session} onOpen={onOpen} />
      ))}
    </div>
  );
}

function ScheduleRow({
  session,
  onOpen,
}: {
  session: TimetableSession;
  onOpen: (session: TimetableSession) => void;
}) {
  const status = STATUS_META[session.status];
  const isCancelled = session.status === "cancelled";

  return (
    <button
      type="button"
      onClick={() => onOpen(session)}
      className="motion-control group relative grid min-h-touch w-full grid-cols-[50px_4px_minmax(0,1fr)_auto] gap-2.5 rounded-card border border-transparent bg-white px-3 py-3 text-left hover:border-primary-200 hover:bg-primary-50/30 active:scale-[.995] sm:grid-cols-[62px_4px_minmax(0,1fr)_auto] sm:gap-3 sm:px-4"
    >
      <span className="pt-0.5 text-sm font-bold tabular-nums text-neutral-900">
        {format(session.startAt.toDate(), "HH:mm")}
        <span className="mt-0.5 block text-2xs font-medium text-neutral-400">
          {format(session.endAt.toDate(), "HH:mm")}
        </span>
      </span>
      <span className={`h-full min-h-12 rounded-full ${status.rail}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className={`block truncate text-sm font-bold ${isCancelled ? "text-neutral-500 line-through" : "text-neutral-900"}`}>
          {session.className}
        </span>
        <span className="mt-1 block truncate text-xs text-neutral-500">{session.title}</span>
        {session.location && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600">
            <MapPin size={14} aria-hidden="true" />
            {session.location}
          </span>
        )}
      </span>
      <span className="self-start">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </span>
    </button>
  );
}

function NextSessionCard({
  session,
  onOpen,
}: {
  session?: TimetableSession;
  onOpen: (session: TimetableSession) => void;
}) {
  if (!session) {
    return (
      <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[var(--shadow-1)]">
        <CalendarDays className="text-neutral-300" size={28} aria-hidden="true" />
        <h3 className="mt-3 text-base font-bold text-neutral-900">Chưa có buổi học sắp tới</h3>
        <p className="mt-1 text-xs leading-5 text-neutral-500">Lịch mới sẽ xuất hiện tại đây khi trung tâm cập nhật.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-card border border-primary-200 bg-white shadow-[var(--shadow-2)]">
      <div className="border-b border-primary-100 bg-primary-50 px-4 py-3">
        <p className="text-xs font-bold text-primary-700">Buổi học tiếp theo</p>
      </div>
      <div className="p-4">
        <p className="text-sm font-bold capitalize text-neutral-900">
          {format(session.startAt.toDate(), "EEEE, dd/MM", { locale: vi })}
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-3xl font-extrabold tabular-nums tracking-tight text-primary-700">
            {format(session.startAt.toDate(), "HH:mm")}
          </strong>
          <span className="text-xs font-semibold text-neutral-400">
            đến {format(session.endAt.toDate(), "HH:mm")}
          </span>
        </div>
        <h3 className="mt-3 text-base font-bold text-neutral-900">{session.className}</h3>
        <p className="mt-1 text-xs text-neutral-500">{session.title}</p>
        <div className="mt-4 grid gap-2 text-xs font-medium text-neutral-600">
          {session.location && (
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} className="text-primary-500" aria-hidden="true" />
              {session.location}
            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <Clock3 size={15} className="text-primary-500" aria-hidden="true" />
            {format(session.startAt.toDate(), "HH:mm")} - {format(session.endAt.toDate(), "HH:mm")}
          </span>
          <span className="inline-flex items-center gap-2">
            <BookOpen size={15} className="text-primary-500" aria-hidden="true" />
            <StatusBadge tone={STATUS_META[session.status].tone}>{STATUS_META[session.status].label}</StatusBadge>
          </span>
        </div>
        {session.note && (
          <p className="mt-4 rounded-input border border-warning-100 bg-warning-50 p-3 text-xs leading-5 text-warning-900">
            {session.note}
          </p>
        )}
        <button
          type="button"
          onClick={() => onOpen(session)}
          className="motion-control mt-4 min-h-touch w-full rounded-input bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800 active:scale-[.98]"
        >
          Xem chi tiết
        </button>
      </div>
    </section>
  );
}
