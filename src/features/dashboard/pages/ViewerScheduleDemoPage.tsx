import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DemoSessionStatus = "scheduled" | "rescheduled" | "cancelled" | "completed";

interface DemoSession {
  id: string;
  studentId: string;
  className: string;
  topic: string;
  start: Date;
  end: Date;
  location: string;
  teacher: string;
  status: DemoSessionStatus;
  note?: string;
}

const DEMO_NOW = new Date(2026, 6, 30, 16, 30);
const INITIAL_WEEK = startOfWeek(DEMO_NOW, { weekStartsOn: 1 });

const STUDENTS = [
  { id: "minh", name: "Nguyễn Gia Minh", code: "HS001" },
  { id: "an", name: "Nguyễn Ngọc An", code: "HS018" },
];

const SESSIONS: DemoSession[] = [
  {
    id: "m1",
    studentId: "minh",
    className: "Toán tư duy A",
    topic: "Phân số và bài toán thực tế",
    start: new Date(2026, 6, 28, 18, 0),
    end: new Date(2026, 6, 28, 19, 30),
    location: "Phòng 201",
    teacher: "Cô Thanh Hà",
    status: "completed",
  },
  {
    id: "m2",
    studentId: "minh",
    className: "Tiếng Anh giao tiếp",
    topic: "Everyday conversations",
    start: new Date(2026, 6, 30, 18, 0),
    end: new Date(2026, 6, 30, 19, 15),
    location: "Phòng 105",
    teacher: "Thầy Minh Quân",
    status: "rescheduled",
    note: "Buổi học được chuyển từ 17:30 sang 18:00.",
  },
  {
    id: "m3",
    studentId: "minh",
    className: "Toán tư duy A",
    topic: "Hình học trực quan",
    start: new Date(2026, 7, 1, 8, 30),
    end: new Date(2026, 7, 1, 10, 0),
    location: "Phòng 201",
    teacher: "Cô Thanh Hà",
    status: "scheduled",
  },
  {
    id: "m4",
    studentId: "minh",
    className: "Câu lạc bộ Khoa học",
    topic: "Thí nghiệm về áp suất",
    start: new Date(2026, 7, 2, 9, 0),
    end: new Date(2026, 7, 2, 10, 30),
    location: "Phòng Lab 02",
    teacher: "Thầy Quốc Bảo",
    status: "cancelled",
    note: "Trung tâm sẽ thông báo lịch học bù sau.",
  },
  {
    id: "a1",
    studentId: "an",
    className: "Tiền tiểu học",
    topic: "Làm quen chữ cái",
    start: new Date(2026, 6, 29, 17, 30),
    end: new Date(2026, 6, 29, 18, 30),
    location: "Phòng 102",
    teacher: "Cô Hồng Nhung",
    status: "completed",
  },
  {
    id: "a2",
    studentId: "an",
    className: "Mỹ thuật sáng tạo",
    topic: "Thế giới dưới đại dương",
    start: new Date(2026, 6, 31, 17, 30),
    end: new Date(2026, 6, 31, 18, 30),
    location: "Phòng Nghệ thuật",
    teacher: "Cô Bảo Trâm",
    status: "scheduled",
  },
];

const STATUS_META: Record<
  DemoSessionStatus,
  { label: string; tone: "info" | "warning" | "danger" | "success"; rail: string }
> = {
  scheduled: { label: "Đã lên lịch", tone: "info", rail: "bg-primary-500" },
  rescheduled: { label: "Đã đổi lịch", tone: "warning", rail: "bg-warning-500" },
  cancelled: { label: "Đã hủy", tone: "danger", rail: "bg-danger-500" },
  completed: { label: "Đã học", tone: "success", rail: "bg-success-500" },
};

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function SessionRow({
  session,
  onOpen,
}: {
  session: DemoSession;
  onOpen: (session: DemoSession) => void;
}) {
  const status = STATUS_META[session.status];
  const isCancelled = session.status === "cancelled";

  return (
    <button
      type="button"
      onClick={() => onOpen(session)}
      className="motion-control group relative grid min-h-touch w-full grid-cols-[54px_4px_minmax(0,1fr)_auto] gap-3 rounded-card border border-transparent bg-white px-3 py-3 text-left hover:border-primary-200 hover:bg-primary-50/30 active:scale-[.995] sm:grid-cols-[62px_4px_minmax(0,1fr)_auto] sm:px-4"
    >
      <span className="pt-0.5 text-sm font-bold tabular-nums text-neutral-900">
        {format(session.start, "HH:mm")}
        <span className="mt-0.5 block text-2xs font-medium text-neutral-400">
          {format(session.end, "HH:mm")}
        </span>
      </span>
      <span className={`h-full min-h-12 rounded-full ${status.rail}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className={`block truncate text-sm font-bold ${isCancelled ? "text-neutral-500 line-through" : "text-neutral-900"}`}>
          {session.className}
        </span>
        <span className="mt-1 block truncate text-xs text-neutral-500">{session.topic}</span>
        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" />
            {session.location}
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <BookOpen size={14} aria-hidden="true" />
            {session.teacher}
          </span>
        </span>
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
  session?: DemoSession;
  onOpen: (session: DemoSession) => void;
}) {
  if (!session) {
    return (
      <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[var(--shadow-1)]">
        <CalendarDays className="text-neutral-300" size={28} aria-hidden="true" />
        <h2 className="mt-3 text-base font-bold text-neutral-900">Chưa có buổi học sắp tới</h2>
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
          {format(session.start, "EEEE, dd/MM", { locale: vi })}
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-3xl font-extrabold tabular-nums tracking-tight text-primary-700">
            {format(session.start, "HH:mm")}
          </strong>
          <span className="text-xs font-semibold text-neutral-400">đến {format(session.end, "HH:mm")}</span>
        </div>
        <h3 className="mt-3 text-base font-bold text-neutral-900">{session.className}</h3>
        <p className="mt-1 text-xs text-neutral-500">{session.topic}</p>
        <div className="mt-4 grid gap-2 text-xs font-medium text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <MapPin size={15} className="text-primary-500" aria-hidden="true" />
            {session.location}
          </span>
          <span className="inline-flex items-center gap-2">
            <BookOpen size={15} className="text-primary-500" aria-hidden="true" />
            {session.teacher}
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

export default function ViewerScheduleDemoPage() {
  const [studentId, setStudentId] = useState(STUDENTS[0].id);
  const [weekStart, setWeekStart] = useState(INITIAL_WEEK);
  const [selectedDay, setSelectedDay] = useState(DEMO_NOW);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const student = STUDENTS.find((item) => item.id === studentId) ?? STUDENTS[0];
  const studentSessions = useMemo(
    () => SESSIONS
      .filter((session) => session.studentId === studentId)
      .sort((left, right) => left.start.getTime() - right.start.getTime()),
    [studentId],
  );
  const weekSessions = useMemo(
    () => studentSessions.filter((session) => days.some((day) => isSameDay(session.start, day))),
    [days, studentSessions],
  );
  const nextSession = studentSessions.find(
    (session) => session.status !== "cancelled" && session.start.getTime() >= DEMO_NOW.getTime(),
  );
  const selectedDaySessions = weekSessions.filter((session) => isSameDay(session.start, selectedDay));
  const activeWeekIsCurrent = isSameDay(weekStart, INITIAL_WEEK);

  const changeWeek = (direction: -1 | 1) => {
    const nextWeek = direction === -1 ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1);
    setWeekStart(nextWeek);
    setSelectedDay(nextWeek);
  };

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`demo-day-${format(day, "yyyy-MM-dd")}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <div className="min-h-[100dvh] bg-neutral-50 pb-12">
      <div className="border-b border-primary-100 bg-primary-50 px-4 py-2.5 text-center text-xs font-semibold text-primary-800">
        Bản demo giao diện lịch học phụ huynh. Dữ liệu minh họa, không kết nối Firestore.
      </div>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-primary-700">Cổng thông tin phụ huynh</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">Lịch học</h1>
            <p className="mt-1.5 text-sm text-neutral-500">Theo dõi buổi học và các thay đổi quan trọng trong tuần.</p>
          </div>
          <label className="block sm:min-w-64">
            <span className="mb-1.5 block text-xs font-bold text-neutral-600">Đang xem lịch của</span>
            <span className="relative block">
              <select
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  setSelectedDay(DEMO_NOW);
                  setWeekStart(INITIAL_WEEK);
                }}
                className="min-h-touch w-full appearance-none rounded-input border border-neutral-300 bg-white px-3 pr-10 text-sm font-semibold text-neutral-800 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                {STUDENTS.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.code}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} aria-hidden="true" />
            </span>
          </label>
        </div>

        <div className="mb-4 lg:hidden">
          <NextSessionCard session={nextSession} onOpen={setSelectedSession} />
        </div>

        <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <header className="border-b border-neutral-200 px-3 py-3 sm:px-5 sm:py-4">
            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
              <button
                type="button"
                aria-label="Xem tuần trước"
                onClick={() => changeWeek(-1)}
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
                  disabled={activeWeekIsCurrent}
                  onClick={() => {
                    setWeekStart(INITIAL_WEEK);
                    setSelectedDay(DEMO_NOW);
                  }}
                  className="mt-1 text-xs font-semibold text-primary-700 hover:underline disabled:text-neutral-400 disabled:no-underline"
                >
                  {activeWeekIsCurrent ? "Tuần này" : "Về tuần này"}
                </button>
              </div>
              <button
                type="button"
                aria-label="Xem tuần sau"
                onClick={() => changeWeek(1)}
                className="motion-control grid min-h-touch place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700"
              >
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            </div>

            <div aria-label="Chọn ngày trong tuần" className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
              {days.map((day) => {
                const sessionCount = weekSessions.filter((session) => isSameDay(session.start, day)).length;
                const selected = isSameDay(day, selectedDay);
                const today = isSameDay(day, DEMO_NOW);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${format(day, "EEEE, dd/MM", { locale: vi })}, ${sessionCount} buổi học`}
                    onClick={() => selectDay(day)}
                    className={`motion-control relative min-h-[58px] rounded-input border px-1 py-2 text-center ${
                      selected
                        ? "border-primary-600 bg-primary-700 text-white shadow-[0_6px_16px_rgba(35,72,214,.2)]"
                        : today
                          ? "border-primary-200 bg-primary-50 text-primary-800"
                          : "border-transparent text-neutral-500 hover:border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="block text-2xs font-bold uppercase">{format(day, "EEEEEE", { locale: vi })}</span>
                    <span className="mt-1 block text-sm font-extrabold tabular-nums">{format(day, "dd")}</span>
                    {sessionCount > 0 && (
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

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 px-3 py-4 sm:px-5">
              <div className="lg:hidden">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold capitalize text-neutral-900">
                    {format(selectedDay, "EEEE, dd/MM", { locale: vi })}
                  </h2>
                  <span className="text-xs font-semibold text-neutral-400">{selectedDaySessions.length} buổi học</span>
                </div>
                {selectedDaySessions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDaySessions.map((session) => (
                      <SessionRow key={session.id} session={session} onOpen={setSelectedSession} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-card border border-dashed border-neutral-300 px-5 py-10 text-center">
                    <CalendarDays className="mx-auto text-neutral-300" size={30} aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-neutral-700">Không có buổi học trong ngày này</p>
                    <p className="mt-1 text-xs text-neutral-500">Chọn ngày có dấu chấm để xem lịch học.</p>
                  </div>
                )}
              </div>

              <div className="hidden lg:block">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">Lịch trong tuần</h2>
                    <p className="mt-1 text-xs text-neutral-500">Các buổi học được sắp theo ngày và thời gian.</p>
                  </div>
                  <span className="text-xs font-semibold text-neutral-500">{weekSessions.length} buổi học</span>
                </div>
                {weekSessions.length > 0 ? (
                  <div className="space-y-5">
                    {days.map((day) => {
                      const sessions = weekSessions.filter((session) => isSameDay(session.start, day));
                      if (!sessions.length) return null;
                      return (
                        <section key={day.toISOString()} id={`demo-day-${format(day, "yyyy-MM-dd")}`}>
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="text-sm font-bold capitalize text-neutral-900">
                              {format(day, "EEEE, dd/MM", { locale: vi })}
                            </h3>
                            {isSameDay(day, DEMO_NOW) && <StatusBadge tone="info">Hôm nay</StatusBadge>}
                          </div>
                          <div className="space-y-1 rounded-card bg-neutral-50 p-1.5">
                            {sessions.map((session) => (
                              <SessionRow key={session.id} session={session} onOpen={setSelectedSession} />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-card border border-dashed border-neutral-300 px-6 py-14 text-center">
                    <CalendarDays className="mx-auto text-neutral-300" size={34} aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-neutral-700">Tuần này chưa có lịch học</p>
                  </div>
                )}
              </div>
            </div>

            <aside className="hidden border-l border-neutral-200 bg-neutral-50/70 p-4 lg:block">
              <div className="sticky top-4 space-y-4">
                <NextSessionCard session={nextSession} onOpen={setSelectedSession} />
                <section className="rounded-card border border-neutral-200 bg-white p-4">
                  <h2 className="text-sm font-bold text-neutral-900">Tóm tắt tuần</h2>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-input bg-neutral-50 p-3">
                      <dt className="text-2xs font-semibold text-neutral-500">Tổng số buổi</dt>
                      <dd className="mt-1 text-xl font-extrabold tabular-nums text-neutral-900">{weekSessions.length}</dd>
                    </div>
                    <div className="rounded-input bg-warning-50 p-3">
                      <dt className="text-2xs font-semibold text-warning-700">Có thay đổi</dt>
                      <dd className="mt-1 text-xl font-extrabold tabular-nums text-warning-900">
                        {weekSessions.filter((session) => session.status === "rescheduled" || session.status === "cancelled").length}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs leading-5 text-neutral-500">
                    Đang xem lịch của <span className="font-semibold text-neutral-700">{student.name}</span>.
                  </p>
                </section>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Modal
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.className ?? ""}
        description={selectedSession?.topic}
        size="sm"
      >
        {selectedSession && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_META[selectedSession.status].tone}>
                {STATUS_META[selectedSession.status].label}
              </StatusBadge>
              <span className="text-xs font-medium text-neutral-500">{student.name}</span>
            </div>
            <dl className="mt-5 grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 shrink-0 text-primary-600" size={18} aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold text-neutral-500">Thời gian</dt>
                  <dd className="mt-1 font-bold capitalize text-neutral-900">
                    {format(selectedSession.start, "EEEE, dd/MM/yyyy", { locale: vi })}
                  </dd>
                  <dd className="mt-0.5 font-semibold tabular-nums text-neutral-700">
                    {format(selectedSession.start, "HH:mm")} - {format(selectedSession.end, "HH:mm")}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 shrink-0 text-primary-600" size={18} aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold text-neutral-500">Phòng học</dt>
                  <dd className="mt-1 font-bold text-neutral-900">{selectedSession.location}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 shrink-0 text-primary-600" size={18} aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold text-neutral-500">Giáo viên</dt>
                  <dd className="mt-1 font-bold text-neutral-900">{selectedSession.teacher}</dd>
                </div>
              </div>
            </dl>
            {selectedSession.note && (
              <p className="mt-5 rounded-input border border-warning-100 bg-warning-50 p-3 text-xs leading-5 text-warning-900">
                {selectedSession.note}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="motion-control mt-5 min-h-touch w-full rounded-input border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Đóng
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
