import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { Button } from "@/components/ui/Button";

export interface DateRange {
  from: Date;
  to: Date;
}

function buildQuickRanges(): { label: string; range: DateRange }[] {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekEnd = subWeeks(thisWeekEnd, 1);
  const lastMonth = subMonths(now, 1);

  return [
    { label: "Hôm nay", range: { from: startOfDay(now), to: endOfDay(now) } },
    { label: "Tuần này", range: { from: thisWeekStart, to: thisWeekEnd } },
    { label: "Tuần trước", range: { from: lastWeekStart, to: lastWeekEnd } },
    { label: "Tháng này", range: { from: startOfMonth(now), to: endOfDay(now) } },
    { label: "Tháng trước", range: { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) } },
    { label: "30 ngày qua", range: { from: startOfDay(subDays(now, 29)), to: endOfDay(now) } },
  ];
}

function sameRange(a: DateRange | null, b: DateRange | null): boolean {
  if (!a || !b) return a === b;
  return a.from.getTime() === b.from.getTime() && a.to.getTime() === b.to.getTime();
}

interface TimeRangeFilterProps {
  value: DateRange | null;
  onApply: (range: DateRange | null) => void;
}

export function TimeRangeFilter({ value, onApply }: TimeRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(value);
  const dialogRef = useRef<HTMLDivElement>(null);
  const quickRanges = buildQuickRanges();

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = value ? `${format(value.from, "dd/MM/yyyy")} - ${format(value.to, "dd/MM/yyyy")}` : "Tất cả thời gian";

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-touch min-w-[248px] items-center gap-2 rounded-input border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-900 shadow-[var(--shadow-1)] transition hover:border-primary-500 hover:text-primary-700 active:scale-[.98]"
      >
        <CalendarDays size={17} className="text-neutral-700" />
        <span className="tabular-nums">{label}</span>
        <ChevronDown size={16} className="ml-auto text-neutral-500" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="time-filter-title"
            className="page-enter grid w-full max-w-[480px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-modal border border-neutral-200 bg-white shadow-[var(--shadow-4)]"
          >
            <header className="flex min-h-[64px] items-center justify-between border-b border-neutral-200 px-5">
              <h2 id="time-filter-title" className="text-lg font-semibold text-neutral-900">
                Lọc theo ngày tạo hồ sơ
              </h2>
              <button
                type="button"
                aria-label="Đóng bộ lọc thời gian"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid gap-4 p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className={`min-h-touch rounded-full border px-3.5 text-xs font-bold transition ${
                    draft === null ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 bg-white text-neutral-600"
                  }`}
                >
                  Tất cả thời gian
                </button>
                {quickRanges.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setDraft(item.range)}
                    className={`min-h-touch rounded-full border px-3.5 text-xs font-bold transition ${
                      sameRange(draft, item.range) ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 bg-white text-neutral-600"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <label className="text-xs font-semibold text-neutral-500">
                  Từ ngày
                  <input
                    type="date"
                    value={draft ? format(draft.from, "yyyy-MM-dd") : ""}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      const from = startOfDay(new Date(event.target.value));
                      setDraft((prev) => ({ from, to: prev && prev.to >= from ? prev.to : endOfDay(from) }));
                    }}
                    className="mt-1 h-11 w-full rounded-input border border-neutral-300 bg-white px-3 text-center text-sm font-semibold text-neutral-900"
                  />
                </label>
                <span className="pb-3 text-sm font-semibold text-neutral-500">đến</span>
                <label className="text-xs font-semibold text-neutral-500">
                  Đến ngày
                  <input
                    type="date"
                    value={draft ? format(draft.to, "yyyy-MM-dd") : ""}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      const to = endOfDay(new Date(event.target.value));
                      setDraft((prev) => ({ from: prev && prev.from <= to ? prev.from : startOfDay(to), to }));
                    }}
                    className="mt-1 h-11 w-full rounded-input border border-neutral-300 bg-white px-3 text-center text-sm font-semibold text-neutral-900"
                  />
                </label>
              </div>
            </div>

            <footer className="flex justify-end gap-3 border-t border-neutral-200 bg-white px-5 py-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft(value);
                  setOpen(false);
                }}
              >
                Bỏ qua
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
              >
                Áp dụng
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
