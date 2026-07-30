import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { addDays, addWeeks, endOfDay, endOfWeek, format, isSameDay, startOfDay, startOfWeek, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SessionDetailModal } from "@/features/sessions/components/SessionDetailModal";
import { TimetableGrid, type TimetableSession } from "@/features/sessions/components/TimetableGrid";
import { ViewerStudentSwitcher } from "@/features/students/components/ViewerStudentSwitcher";
import { useViewerStudentSelection } from "@/features/students/hooks/useViewerStudentSelection";
import { getClass } from "@/services/firestore/classes";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getStudent } from "@/services/firestore/students";

type ViewerTimetableView = "day" | "week";

const WINDOW_PAST_DAYS = 14;
const WINDOW_FUTURE_DAYS = 60;

export default function ViewerSchedulePage() {
  const { userDoc } = useAuth();
  const [view, setView] = useState<ViewerTimetableView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
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

  const classQueries = useQueries({
    queries: classIds.map((id) => ({ queryKey: ["viewer-class", id], queryFn: () => getClass(id) })),
  });
  const classById = useMemo(
    () => new Map(classQueries.map((query, index) => [classIds[index], query.data])),
    [classIds, classQueries],
  );

  const windowFrom = useMemo(() => subDays(today, WINDOW_PAST_DAYS), [today]);
  const windowTo = useMemo(() => addDays(today, WINDOW_FUTURE_DAYS), [today]);
  const sessionQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: ["viewer-sessions", id],
      queryFn: () => listSessionsByClass(id, windowFrom, windowTo),
    })),
  });

  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(anchor), to: endOfDay(anchor) };
    return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
  }, [anchor, view]);

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    return Array.from({ length: 7 }, (_, index) => addDays(range.from, index));
  }, [anchor, range.from, view]);

  const timetableSessions = useMemo<TimetableSession[]>(() => sessionQueries
    .flatMap((query) => query.data ?? [])
    .filter((session) => {
      const start = session.startAt.toDate();
      return start >= range.from && start <= range.to;
    })
    .map((session) => ({
      ...session,
      className: classById.get(session.classId)?.name ?? session.title,
    }))
    .sort((left, right) => left.startAt.toMillis() - right.startAt.toMillis()), [classById, range.from, range.to, sessionQueries]);

  const isLoading = studentQueries.some((query) => query.isLoading)
    || classQueries.some((query) => query.isLoading)
    || sessionQueries.some((query) => query.isLoading);
  const firstError = studentQueries.find((query) => query.error)?.error
    ?? classQueries.find((query) => query.error)?.error
    ?? sessionQueries.find((query) => query.error)?.error;

  const retry = () => {
    studentQueries.forEach((query) => query.refetch());
    classQueries.forEach((query) => query.refetch());
    sessionQueries.forEach((query) => query.refetch());
  };

  const shiftPeriod = (direction: 1 | -1) => {
    setAnchor((current) => view === "day" ? addDays(current, direction) : addWeeks(current, direction));
  };
  const periodLabel = view === "day"
    ? format(anchor, "dd/MM/yyyy")
    : `${format(range.from, "dd/MM")} – ${format(range.to, "dd/MM/yyyy")}`;

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
          <ViewerStudentSwitcher students={students} selectedStudentId={selectedStudent.id} onSelect={selectStudent} />

          <header>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Lịch học</h2>
            <p className="mt-1.5 text-sm text-neutral-500">Theo dõi buổi học, thời gian và phòng học.</p>
          </header>

          <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
            <div className="border-b border-neutral-200 p-3 sm:p-4">
              <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
                <button
                  type="button"
                  aria-label="Kỳ trước"
                  onClick={() => shiftPeriod(-1)}
                  className="motion-control grid min-h-touch place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <div className="text-center">
                  <strong className="block text-sm font-bold tabular-nums text-neutral-900">{periodLabel}</strong>
                  <button type="button" onClick={() => setAnchor(new Date())} className="mt-1 min-h-7 px-2 text-xs font-semibold text-primary-700 hover:underline">
                    Về hôm nay
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Kỳ tiếp"
                  onClick={() => shiftPeriod(1)}
                  className="motion-control grid min-h-touch place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>

              <div role="tablist" aria-label="Kiểu xem lịch" className="mt-3 grid min-h-touch grid-cols-2 gap-1 rounded-input bg-neutral-100 p-1">
                {([
                  { value: "day", label: "Theo ngày" },
                  { value: "week", label: "Theo tuần" },
                ] as { value: ViewerTimetableView; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => setView(value)}
                    className={`motion-control rounded-[7px] px-3 text-xs font-bold ${
                      view === value ? "bg-white text-primary-700 shadow-sm" : "text-neutral-600 hover:text-primary-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:hidden">
              <MobileScheduleList days={days} sessions={timetableSessions} today={today} onOpen={setSelectedSession} />
            </div>
            <div className="hidden md:block">
              <TimetableGrid days={days} sessions={timetableSessions} today={today} onSessionClick={setSelectedSession} />
            </div>
          </section>
        </div>
      )}

      <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} readOnly />
    </>
  );
}

function MobileScheduleList({
  days,
  sessions,
  today,
  onOpen,
}: {
  days: Date[];
  sessions: TimetableSession[];
  today: Date;
  onOpen: (session: TimetableSession) => void;
}) {
  const populatedDays = days
    .map((day) => ({ day, sessions: sessions.filter((session) => isSameDay(session.startAt.toDate(), day)) }))
    .filter((group) => days.length === 1 || group.sessions.length > 0);

  if (populatedDays.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <CalendarDays className="mx-auto text-neutral-300" size={34} aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-neutral-700">Không có buổi học trong thời gian này.</p>
      </div>
    );
  }

  return (
    <div aria-label="Danh sách buổi học" className="divide-y divide-neutral-100">
      {populatedDays.map(({ day, sessions: daySessions }) => (
        <section key={format(day, "yyyy-MM-dd")} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold capitalize text-neutral-900">{format(day, "EEEE, dd/MM", { locale: vi })}</h3>
            {isSameDay(day, today) && <span className="rounded-full bg-primary-50 px-2 py-1 text-2xs font-bold text-primary-700">Hôm nay</span>}
          </div>
          {daySessions.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Không có buổi học trong ngày này.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {daySessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onOpen(session)}
                  className="motion-control min-h-touch w-full rounded-card border border-neutral-200 bg-neutral-50 p-3 text-left hover:border-primary-300 hover:bg-primary-50/40 active:scale-[.99]"
                >
                  <span className="block text-sm font-bold text-neutral-900">{session.className}</span>
                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-neutral-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} aria-hidden="true" />
                      {format(session.startAt.toDate(), "HH:mm")}–{format(session.endAt.toDate(), "HH:mm")}
                    </span>
                    {session.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} aria-hidden="true" />
                        {session.location}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
