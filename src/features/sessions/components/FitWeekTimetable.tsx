import { useState, type DragEvent } from "react";
import { format, isSameDay } from "date-fns";
import type { SessionStatus } from "@/types/academic";
import type { TimetableSession } from "@/features/sessions/components/TimetableGrid";

interface FitWeekTimetableProps {
  days: Date[];
  sessions: TimetableSession[];
  today: Date;
  onSessionClick: (session: TimetableSession) => void;
  onSessionDrop?: (session: TimetableSession, startAt: Date, endAt: Date) => void;
}

type DayBand = "morning" | "afternoon" | "evening";

const BAND_META: Record<DayBand, { label: string; range: string }> = {
  morning: { label: "Sáng", range: "06-12" },
  afternoon: { label: "Chiều", range: "12-18" },
  evening: { label: "Tối", range: "18-23" },
};

const STATUS_TONE: Record<SessionStatus, { border: string; bg: string; pillBg: string; label: string }> = {
  scheduled: { border: "border-info-500", bg: "bg-white", pillBg: "bg-info-700", label: "Lên lịch" },
  rescheduled: { border: "border-warning-500", bg: "bg-warning-50", pillBg: "bg-warning-700", label: "Học bù" },
  completed: { border: "border-success-500", bg: "bg-success-50", pillBg: "bg-success-700", label: "Đã học" },
  cancelled: { border: "border-danger-500", bg: "bg-danger-50", pillBg: "bg-danger-700", label: "Đã hủy" },
};

const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const BANDS: DayBand[] = ["morning", "afternoon", "evening"];
const BAND_DEFAULT_TIME: Record<DayBand, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 14, minute: 0 },
  evening: { hour: 18, minute: 0 },
};

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function bandFor(date: Date): DayBand {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function rangesOverlap(a: TimetableSession, b: TimetableSession): boolean {
  return a.startAt.toMillis() < b.endAt.toMillis() && b.startAt.toMillis() < a.endAt.toMillis();
}

function hasOverlap(sessions: TimetableSession[]): boolean {
  return sessions.some((session, index) => sessions.slice(index + 1).some((next) => rangesOverlap(session, next)));
}

function compactList(items: string[] | undefined, fallback: string): string {
  if (!items || items.length === 0) return fallback;
  if (items.length <= 2) return items.join(", ");
  return `${items.slice(0, 2).join(", ")} +${items.length - 2}`;
}

function dateAt(day: Date, hour: number, minute: number): Date {
  const next = new Date(day);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function moveSessionToBand(session: TimetableSession, day: Date, band: DayBand): { startAt: Date; endAt: Date } {
  const currentStart = session.startAt.toDate();
  const currentEnd = session.endAt.toDate();
  const durationMs = Math.max(15 * 60 * 1000, currentEnd.getTime() - currentStart.getTime());
  const currentBand = bandFor(currentStart);
  const time =
    currentBand === band
      ? { hour: currentStart.getHours(), minute: currentStart.getMinutes() }
      : BAND_DEFAULT_TIME[band];
  const startAt = dateAt(day, time.hour, time.minute);
  return { startAt, endAt: new Date(startAt.getTime() + durationMs) };
}

export function FitWeekTimetable({ days, sessions, today, onSessionClick, onSessionDrop }: FitWeekTimetableProps) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const sessionsByDay = new Map<string, TimetableSession[]>();
  days.forEach((day) => sessionsByDay.set(dayKey(day), []));
  sessions.forEach((session) => {
    const key = dayKey(session.startAt.toDate());
    if (sessionsByDay.has(key)) sessionsByDay.get(key)!.push(session);
  });

  function handleDragStart(event: DragEvent<HTMLElement>, session: TimetableSession) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", session.id);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, day: Date, band: DayBand) {
    event.preventDefault();
    setDropTarget(null);
    const sessionId = event.dataTransfer.getData("text/plain");
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || !onSessionDrop) return;
    const next = moveSessionToBand(session, day, band);
    onSessionDrop(session, next.startAt, next.endAt);
  }

  return (
    <div className="overflow-x-auto lg:overflow-visible">
      <div className="min-w-[1040px]">
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={dayKey(day)}
                className={`border-r border-neutral-200 px-3 py-2.5 last:border-r-0 ${isToday ? "bg-primary-50" : ""}`}
              >
                <p className={`text-[10px] font-extrabold uppercase ${isToday ? "text-primary-600" : "text-neutral-500"}`}>
                  {DOW_LABEL[day.getDay()]}
                </p>
                <p className={`mt-0.5 text-base font-extrabold ${isToday ? "text-primary-700" : "text-neutral-900"}`}>
                  {format(day, "dd/MM")}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid min-h-[560px] grid-cols-7">
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const daySessions = [...(sessionsByDay.get(dayKey(day)) ?? [])].sort(
              (a, b) => a.startAt.toMillis() - b.startAt.toMillis(),
            );
            const sessionsByBand: Record<DayBand, TimetableSession[]> = {
              morning: [],
              afternoon: [],
              evening: [],
            };
            daySessions.forEach((session) => sessionsByBand[bandFor(session.startAt.toDate())].push(session));

            return (
              <div
                key={dayKey(day)}
                className={`grid grid-rows-[0.9fr_1.05fr_1.2fr] border-r border-neutral-200 last:border-r-0 ${
                  isToday ? "bg-primary-50/30" : "bg-white"
                }`}
              >
                {BANDS.map((band) => {
                  const bandSessions = sessionsByBand[band];
                  const overlapped = hasOverlap(bandSessions);
                  return (
                    <div
                      key={band}
                      onDragOver={(event) => {
                        if (!onSessionDrop) return;
                        event.preventDefault();
                        setDropTarget(`${dayKey(day)}-${band}`);
                      }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(event) => handleDrop(event, day, band)}
                      className={`min-h-0 border-b border-dashed border-neutral-200 p-1.5 transition last:border-b-0 ${
                        dropTarget === `${dayKey(day)}-${band}` ? "bg-primary-50 ring-2 ring-inset ring-primary-300" : ""
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase text-neutral-500">
                        <span>{BAND_META[band].label}</span>
                        <span className="text-neutral-400">{BAND_META[band].range}</span>
                      </div>
                      {bandSessions.length === 0 ? (
                        <div className="grid min-h-[44px] place-items-center rounded-input border border-dashed border-neutral-200 text-[11px] font-semibold text-neutral-400">
                          Trống
                        </div>
                      ) : (
                        <div className={`grid content-start gap-1.5 ${overlapped ? "grid-cols-2" : "grid-cols-1"}`}>
                          {bandSessions.map((session) => {
                            const tone = STATUS_TONE[session.status];
                            const canDrag = !!onSessionDrop && session.status !== "completed" && session.status !== "cancelled";
                            const room = session.location || session.classLocation || "Chưa có phòng";
                            const studentLabel =
                              typeof session.studentCount === "number" ? `${session.studentCount} học sinh` : "Chưa có sĩ số";
                            return (
                              <button
                                key={session.id}
                                type="button"
                                draggable={canDrag}
                                onDragStart={(event) => handleDragStart(event, session)}
                                onClick={() => onSessionClick(session)}
                                className={`min-h-[78px] overflow-hidden rounded-input border border-l-4 px-2 py-1.5 text-left shadow-[0_1px_2px_rgba(28,26,21,.05)] transition hover:brightness-95 ${
                                  canDrag ? "cursor-grab active:cursor-grabbing" : ""
                                } ${tone.border} ${tone.bg}`}
                              >
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold leading-tight text-neutral-900">
                                    {session.className}
                                  </span>
                                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white ${tone.pillBg}`}>
                                    {tone.label}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-[10.5px] font-semibold text-neutral-600">
                                  {session.courseName ?? compactList(session.subjectNames, "Chưa gắn khóa học")}
                                </p>
                                <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-extrabold text-neutral-900">
                                  <span className="rounded-[6px] bg-neutral-100 px-1.5 py-0.5">
                                    {format(session.startAt.toDate(), "HH:mm")}-{format(session.endAt.toDate(), "HH:mm")}
                                  </span>
                                  <span className="min-w-0 truncate">{compactList(session.teacherNames, "Chưa gắn GV")}</span>
                                </p>
                                <p className="mt-1 truncate text-[10.5px] font-semibold text-neutral-500">
                                  {room} · {studentLabel}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
