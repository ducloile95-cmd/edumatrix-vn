import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";

interface MonthGridProps {
  month: Date;
  sessionCountByDay: Map<string, number>;
  today: Date;
  onSelectDate: (date: Date) => void;
}

const DOW_LABEL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function MonthGrid({ month, sessionCountByDay, today, onSelectDate }: MonthGridProps) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="grid grid-cols-7 gap-px border border-neutral-200 bg-neutral-200">
      {DOW_LABEL.map((label) => (
        <div key={label} className="bg-neutral-50 py-2 text-center text-3xs font-bold uppercase tracking-wide text-neutral-500">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const count = sessionCountByDay.get(key) ?? 0;
        const isToday = isSameDay(day, today);
        const inMonth = isSameMonth(day, month);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(day)}
            className={`flex min-h-[92px] flex-col gap-1.5 bg-white p-1.5 text-left transition hover:bg-neutral-50 ${
              !inMonth ? "bg-neutral-50 text-neutral-400" : ""
            } ${isToday ? "bg-primary-50 hover:bg-primary-50" : ""}`}
          >
            <span className={`text-xs font-bold ${isToday ? "text-primary-700" : inMonth ? "text-neutral-700" : "text-neutral-400"}`}>
              {format(day, "d")}
            </span>
            {count > 0 && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-3xs font-bold text-primary-700">
                {count} buổi
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
