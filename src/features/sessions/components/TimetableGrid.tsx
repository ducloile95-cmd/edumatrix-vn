import { format, isSameDay } from "date-fns";
import {
  GRID_HEIGHT_PX,
  HOUR_HEIGHT_PX,
  hourLabels,
  layoutDaySessions,
} from "@/features/sessions/utils/timetableLayout";
import type { SessionDoc, SessionStatus } from "@/types/academic";

export type TimetableSession = SessionDoc & {
  id: string;
  className: string;
  classLocation?: string;
  courseName?: string;
  subjectNames?: string[];
  teacherNames?: string[];
  studentCount?: number;
};

interface TimetableGridProps {
  days: Date[];
  sessions: TimetableSession[];
  today: Date;
  onSessionClick: (session: TimetableSession) => void;
}

const STATUS_TONE: Record<SessionStatus, { bg: string; border: string; text: string; tagBg?: string; tagLabel?: string }> = {
  scheduled: { bg: "bg-info-50", border: "border-info-500", text: "text-info-700" },
  rescheduled: { bg: "bg-warning-50", border: "border-warning-500", text: "text-warning-700", tagBg: "bg-warning-700", tagLabel: "Học bù" },
  completed: { bg: "bg-success-50", border: "border-success-500", text: "text-success-700", tagBg: "bg-success-700", tagLabel: "Đã học" },
  cancelled: { bg: "bg-danger-50", border: "border-danger-500", text: "text-danger-700", tagBg: "bg-danger-700", tagLabel: "Đã hủy" },
};

const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function TimetableGrid({ days, sessions, today, onSessionClick }: TimetableGridProps) {
  const wide = days.length === 1;

  const sessionsByDay = new Map<string, TimetableSession[]>();
  days.forEach((day) => sessionsByDay.set(dayKey(day), []));
  sessions.forEach((session) => {
    const key = dayKey(session.startAt.toDate());
    if (sessionsByDay.has(key)) sessionsByDay.get(key)!.push(session);
  });

  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <div
        className="grid min-w-[900px]"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(120px, 1fr))` }}
      >
        <div className="sticky left-0 top-0 z-[3] border-b border-r border-neutral-200 bg-white" />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={dayKey(day)}
              className={`sticky top-0 z-[2] border-b border-r border-neutral-100 px-1.5 py-2 text-center last:border-r-0 ${
                isToday ? "bg-primary-50" : "bg-white"
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-primary-600" : "text-neutral-500"}`}>
                {DOW_LABEL[day.getDay()]}
              </p>
              <p className={`mt-0.5 text-base font-bold ${isToday ? "text-primary-700" : "text-neutral-900"}`}>
                {format(day, "dd/MM")}
              </p>
            </div>
          );
        })}

        <div className="sticky left-0 z-[1] border-r border-neutral-200 bg-white">
          {hourLabels().map((label, index) => (
            <div key={label} className="relative" style={{ height: HOUR_HEIGHT_PX }}>
              <span className={`absolute right-2 bg-white px-0.5 text-[10px] font-semibold text-neutral-500 ${index === 0 ? "top-1" : "-top-[7px]"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const daySessions = sessionsByDay.get(dayKey(day)) ?? [];
          const sessionById = new Map(daySessions.map((session) => [session.id, session]));
          // Chi truyen startAt/endAt dang Date (can cho toan cong thuc layout) kem id de tra lai
          // TimetableSession goc (van giu Timestamp) - tranh ghi de kieu du lieu cua session that.
          const positioned = layoutDaySessions(
            daySessions.map((session) => ({ id: session.id, startAt: session.startAt.toDate(), endAt: session.endAt.toDate() })),
          );
          return (
            <div
              key={dayKey(day)}
              className={`relative border-r border-neutral-100 last:border-r-0 ${isToday ? "bg-primary-50/40" : ""}`}
              style={{
                height: GRID_HEIGHT_PX,
                backgroundImage: `repeating-linear-gradient(to bottom, #E7E5E2 0, #E7E5E2 1px, transparent 1px, transparent ${HOUR_HEIGHT_PX}px)`,
              }}
            >
              {positioned.length === 0 && wide && (
                <p className="absolute left-4 top-10 text-xs text-neutral-400">Không có buổi học trong ngày này.</p>
              )}
              {positioned.map((layout) => {
                const session = sessionById.get(layout.id);
                if (!session) return null;
                const tone = STATUS_TONE[session.status];
                const widthPct = 100 / layout.colCount;
                const leftPct = layout.col * widthPct;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSessionClick(session)}
                    className={`absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left transition hover:brightness-95 ${tone.bg} ${tone.border} ${tone.text}`}
                    style={{
                      top: layout.topPx,
                      height: layout.heightPx,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }}
                  >
                    <p className={`truncate font-bold leading-tight ${wide ? "text-[13px]" : "text-[11px]"}`}>{session.className}</p>
                    <p className={`truncate font-semibold ${wide ? "text-[11px]" : "text-[10px]"}`}>
                      {format(layout.startAt, "HH:mm")}-{format(layout.endAt, "HH:mm")}
                      {wide && session.location ? ` · ${session.location}` : ""}
                    </p>
                    {tone.tagLabel && (
                      <span className={`mt-0.5 inline-block rounded px-1 py-px text-[9px] font-extrabold uppercase tracking-wide text-white ${tone.tagBg}`}>
                        {tone.tagLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
