import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const QUICK_RANGES = [
  { label: "Hôm nay", value: "14/07/2026 - 14/07/2026" },
  { label: "Tuần này", value: "13/07/2026 - 19/07/2026" },
  { label: "Tuần trước", value: "06/07/2026 - 12/07/2026" },
  { label: "Tháng này", value: "01/07/2026 - 14/07/2026" },
  { label: "Tháng trước", value: "01/06/2026 - 30/06/2026" },
  { label: "30 ngày qua", value: "15/06/2026 - 14/07/2026" },
];

export function TimeRangeFilter() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(QUICK_RANGES[3]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
        <span className="tabular-nums">{selected.value}</span>
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
            className="page-enter grid max-h-[calc(100dvh-2rem)] w-full max-w-[820px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-modal border border-neutral-200 bg-white shadow-[var(--shadow-4)]"
          >
            <header className="flex min-h-[64px] items-center justify-between border-b border-neutral-200 px-5">
              <h2 id="time-filter-title" className="text-lg font-semibold text-neutral-900">
                Thời gian báo cáo
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

            <div className="grid min-h-0 grid-cols-[200px_1fr]">
              <aside className="border-r border-neutral-200 bg-neutral-50 py-3">
                {QUICK_RANGES.map((range) => (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() => setSelected(range)}
                    className={`min-h-[38px] w-full border-l-4 px-5 text-left text-sm font-semibold transition ${
                      selected.label === range.label
                        ? "border-success-500 bg-success-100 text-success-700"
                        : "border-transparent text-neutral-700 hover:bg-white hover:text-primary-700"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
                <div className="mt-3 flex items-center gap-2 border-t border-neutral-200 px-5 pt-3 text-sm text-neutral-500">
                  <input
                    type="number"
                    value={29}
                    readOnly
                    aria-label="Số ngày qua"
                    className="h-8 w-12 rounded-input border border-neutral-300 bg-white text-center text-sm font-semibold text-neutral-800"
                  />
                  ngày qua
                </div>
              </aside>

              <section className="grid gap-4 p-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <input
                    type="text"
                    value={selected.value.split(" - ")[0]}
                    readOnly
                    aria-label="Từ ngày"
                    className="h-11 rounded-input border border-neutral-300 bg-white text-center text-sm font-semibold text-neutral-900"
                  />
                  <span className="text-sm font-semibold text-neutral-500">đến</span>
                  <input
                    type="text"
                    value={selected.value.split(" - ")[1]}
                    readOnly
                    aria-label="Đến ngày"
                    className="h-11 rounded-input border border-neutral-300 bg-white text-center text-sm font-semibold text-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-[36px_1fr_36px] items-center gap-3 text-center text-sm font-semibold text-neutral-900">
                  <button type="button" className="h-9 rounded-full border border-success-500 text-success-700">
                    &lt;
                  </button>
                  <span>Tháng 7 2026 - Tháng 8 2026</span>
                  <button type="button" className="h-9 rounded-full border border-success-500 text-success-700">
                    &gt;
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 text-center text-xs font-semibold text-neutral-800">
                  <CalendarMock month="july" />
                  <CalendarMock month="august" />
                </div>
              </section>
            </div>

            <footer className="flex justify-end gap-3 border-t border-neutral-200 bg-white px-5 py-4">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Bỏ qua
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Áp dụng
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarMock({ month }: { month: "july" | "august" }) {
  const days = month === "july"
    ? ["", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "", ""]
    : ["", "", "", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
  return (
    <div className="grid grid-cols-7 gap-1">
      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
        <span key={day} className="grid h-7 place-items-center text-[11px] text-neutral-500">
          {day}
        </span>
      ))}
      {days.map((day, index) => {
        const julyRange = month === "july" && Number(day) >= 1 && Number(day) <= 14;
        const selected = month === "july" && (day === "1" || day === "14");
        return (
          <span
            key={`${day}-${index}`}
            className={`grid h-8 place-items-center rounded-sm tabular-nums ${
              selected ? "rounded-full bg-success-500 text-white" : julyRange ? "bg-success-100" : ""
            }`}
          >
            {day}
          </span>
        );
      })}
    </div>
  );
}
