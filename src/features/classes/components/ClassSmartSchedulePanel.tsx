import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Sparkles } from "lucide-react";
import { generateRecurringSessions } from "@/utils/recurrence";

const WEEKDAYS = [
  { day: 1, short: "T2", full: "Thứ 2" },
  { day: 2, short: "T3", full: "Thứ 3" },
  { day: 3, short: "T4", full: "Thứ 4" },
  { day: 4, short: "T5", full: "Thứ 5" },
  { day: 5, short: "T6", full: "Thứ 6" },
  { day: 6, short: "T7", full: "Thứ 7" },
  { day: 0, short: "CN", full: "Chủ nhật" },
] as const;

export interface RecurrenceFormState {
  startDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  sessionCount: number;
}

interface ClassSmartSchedulePanelProps {
  readOnly?: boolean;
  recurrence: RecurrenceFormState;
  setRecurrence: Dispatch<SetStateAction<RecurrenceFormState>>;
  toggleDay: (day: number) => void;
  recurrencePreview: ReturnType<typeof generateRecurringSessions> | null;
}

const FIELD_CLASS = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

export function ClassSmartSchedulePanel({
  readOnly = false,
  recurrence,
  setRecurrence,
  toggleDay,
  recurrencePreview,
}: ClassSmartSchedulePanelProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const sessionsByDate = useMemo(() => new Map(
    (recurrencePreview?.sessions ?? []).map((session, index) => [format(session.startAt, "yyyy-MM-dd"), index + 1]),
  ), [recurrencePreview]);
  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }),
  }), [visibleMonth]);

  useEffect(() => {
    if (recurrence.startDate) {
      setVisibleMonth(startOfMonth(new Date(`${recurrence.startDate}T00:00:00`)));
    }
  }, [recurrence.startDate]);

  const setStartDate = (value: string) => {
    setRecurrence((current) => ({ ...current, startDate: value }));
    if (value) setVisibleMonth(startOfMonth(new Date(`${value}T00:00:00`)));
  };
  const selectCalendarDate = (date: Date) => {
    if (readOnly) return;
    const day = date.getDay();
    setRecurrence((current) => ({
      ...current,
      startDate: format(date, "yyyy-MM-dd"),
      daysOfWeek: current.daysOfWeek.includes(day) ? current.daysOfWeek : [...current.daysOfWeek, day].sort(),
    }));
  };
  const goToStartMonth = () => {
    if (recurrence.startDate) setVisibleMonth(startOfMonth(new Date(`${recurrence.startDate}T00:00:00`)));
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Sparkles size={18} /></span>
          <div>
            <h3 className="text-sm font-bold text-neutral-950">Lịch học thông minh</h3>
            <p className="mt-0.5 text-xs leading-5 text-neutral-500">Tự động sinh buổi học theo tuần và kiểm tra trực tiếp trên lịch tháng.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success-100 bg-success-50 px-3 py-2 text-xs font-bold text-success-800">
          <Check size={14} aria-hidden="true" />
          {readOnly ? "Lịch đang áp dụng" : "Mặc định bật"}
        </span>
      </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
          <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div>
              <label htmlFor="recurrence-start-date" className="mb-1.5 block text-xs font-bold text-neutral-700">Ngày bắt đầu<span className="ml-0.5 text-danger-500">*</span></label>
              <input id="recurrence-start-date" type="date" value={recurrence.startDate} disabled={readOnly} onChange={(event) => setStartDate(event.target.value)} className={FIELD_CLASS} />
            </div>
            <div>
              <span className="mb-2 block text-xs font-bold text-neutral-700">Các thứ trong tuần<span className="ml-0.5 text-danger-500">*</span></span>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Chọn thứ trong tuần">
                {WEEKDAYS.map(({ day, short, full }) => {
                  const checked = recurrence.daysOfWeek.includes(day);
                  return (
                    <button key={day} type="button" disabled={readOnly} aria-label={full} aria-pressed={checked} onClick={() => toggleDay(day)} className={`min-h-9 rounded-lg border text-xs font-bold transition disabled:cursor-default ${checked ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300 hover:text-primary-700"}`}>
                      {short}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 2xl:grid-cols-2">
              <div><label htmlFor="recurrence-start-time" className="mb-1.5 block text-xs font-bold text-neutral-700">Bắt đầu<span className="ml-0.5 text-danger-500">*</span></label><input id="recurrence-start-time" type="time" value={recurrence.startTime} disabled={readOnly} onChange={(event) => setRecurrence((current) => ({ ...current, startTime: event.target.value }))} className={FIELD_CLASS} /></div>
              <div><label htmlFor="recurrence-end-time" className="mb-1.5 block text-xs font-bold text-neutral-700">Kết thúc<span className="ml-0.5 text-danger-500">*</span></label><input id="recurrence-end-time" type="time" value={recurrence.endTime} disabled={readOnly} onChange={(event) => setRecurrence((current) => ({ ...current, endTime: event.target.value }))} className={FIELD_CLASS} /></div>
            </div>
            <div><label htmlFor="recurrence-session-count" className="mb-1.5 block text-xs font-bold text-neutral-700">Tổng số buổi<span className="ml-0.5 text-danger-500">*</span></label><input id="recurrence-session-count" type="number" min={1} step={1} value={recurrence.sessionCount} disabled={readOnly} onChange={(event) => setRecurrence((current) => ({ ...current, sessionCount: Number(event.target.value) }))} className={FIELD_CLASS} /></div>
            <div className="rounded-xl border border-success-100 bg-success-50 p-2.5 text-xs leading-5 text-success-900">
              {recurrencePreview ? <><strong className="block text-sm">{recurrencePreview.sessions.length} buổi dự kiến</strong>Buổi đầu {format(recurrencePreview.sessions[0].startAt, "dd/MM/yyyy")}, bế giảng {format(recurrencePreview.endDate, "dd/MM/yyyy")}.</> : "Điền đủ ngày bắt đầu, thứ trong tuần, giờ học và tổng số buổi để xem trước."}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500"><CalendarDays size={14} /> Lịch tháng tương tác</p><h4 className="mt-0.5 text-base font-black text-neutral-950">Tháng {format(visibleMonth, "MM / yyyy")}</h4></div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={goToStartMonth} disabled={!recurrence.startDate} className="min-h-9 cursor-pointer rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-600 transition hover:border-primary-300 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50">Tháng bắt đầu</button>
                <button type="button" aria-label="Tháng trước" onClick={() => setVisibleMonth((month) => subMonths(month, 1))} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-neutral-300 text-neutral-600 transition hover:border-primary-300 hover:text-primary-700"><ChevronLeft size={17} /></button>
                <button type="button" aria-label="Tháng sau" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-neutral-300 text-neutral-600 transition hover:border-primary-300 hover:text-primary-700"><ChevronRight size={17} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-neutral-200 pb-2 text-center text-[10px] font-bold uppercase tracking-wide text-neutral-400">{WEEKDAYS.map((weekday) => <span key={weekday.day}>{weekday.short}</span>)}</div>
            <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthDays.map((date) => {
                const key = format(date, "yyyy-MM-dd");
                const sessionNumber = sessionsByDate.get(key);
                const isStart = key === recurrence.startDate;
                const inMonth = isSameMonth(date, visibleMonth);
                return (
                  <button key={key} type="button" disabled={readOnly} onClick={() => selectCalendarDate(date)} aria-label={`Chọn ngày bắt đầu ${format(date, "dd/MM/yyyy")}`} aria-pressed={isStart} className={`relative min-h-10 rounded-lg border p-1.5 text-left transition 2xl:min-h-12 ${readOnly ? "cursor-default" : "cursor-pointer"} ${isStart ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100" : sessionNumber ? "border-success-200 bg-success-50 hover:border-success-300" : "border-transparent hover:border-primary-200 hover:bg-neutral-50"} ${inMonth ? "text-neutral-800" : "text-neutral-300"}`}>
                    <span className="text-xs font-bold">{format(date, "d")}</span>
                    {sessionNumber && <span className="mt-1 flex items-center gap-1 text-[9px] font-bold text-success-700 sm:text-[10px]"><Clock3 size={10} /> Buổi {sessionNumber}</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-500">{readOnly ? "Lịch hiện tại được giữ nguyên khi chỉnh sửa thông tin lớp." : "Bấm một ngày để đặt lại ngày bắt đầu; hệ thống tự thêm thứ tương ứng vào quy tắc."}</p>
          </div>
        </div>
    </section>
  );
}
