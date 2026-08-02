import { useMemo, useState, type FormEvent, type ReactNode } from "react";
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
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateRecurringSessions } from "@/utils/recurrence";

const FIELD_CLASS =
  "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
const WEEKDAYS = [
  { day: 1, short: "T2", full: "Thứ 2" },
  { day: 2, short: "T3", full: "Thứ 3" },
  { day: 3, short: "T4", full: "Thứ 4" },
  { day: 4, short: "T5", full: "Thứ 5" },
  { day: 5, short: "T6", full: "Thứ 6" },
  { day: 6, short: "T7", full: "Thứ 7" },
  { day: 0, short: "CN", full: "Chủ nhật" },
] as const;

interface ScheduleState {
  startDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  sessionCount: number;
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-neutral-950">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-neutral-700">
      {children}{required && <span className="ml-0.5 text-danger-500">*</span>}
    </label>
  );
}

function ChipGroup({ label, options }: { label: string; options: string[] }) {
  const [selected, setSelected] = useState([options[0]]);
  return (
    <div>
      <span className="mb-2 block text-xs font-bold text-neutral-700">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected((current) => active ? current.filter((item) => item !== option) : [...current, option])}
              className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition ${active ? "border-primary-500 bg-primary-500 text-white shadow-sm" : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300 hover:text-primary-700"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClassFormPopupDemo({ onClose }: { onClose: () => void }) {
  const today = useMemo(() => new Date(), []);
  const initialDate = format(today, "yyyy-MM-dd");
  const [smartSchedule, setSmartSchedule] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleState>({
    startDate: initialDate,
    daysOfWeek: [2, 4],
    startTime: "18:00",
    endTime: "19:30",
    sessionCount: 12,
  });
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));

  const preview = useMemo(() => {
    if (!smartSchedule || !schedule.startDate || !schedule.startTime || !schedule.endTime || schedule.daysOfWeek.length === 0 || schedule.sessionCount < 1) return null;
    return generateRecurringSessions({
      startDate: new Date(`${schedule.startDate}T00:00:00`),
      daysOfWeek: schedule.daysOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      sessionCount: schedule.sessionCount,
    });
  }, [schedule, smartSchedule]);

  const sessionsByDate = useMemo(() => new Map(
    (preview?.sessions ?? []).map((session, index) => [format(session.startAt, "yyyy-MM-dd"), index + 1]),
  ), [preview]);
  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }),
  }), [visibleMonth]);

  const updateStartDate = (value: string) => {
    setSchedule((current) => ({ ...current, startDate: value }));
    if (value) setVisibleMonth(startOfMonth(new Date(`${value}T00:00:00`)));
  };
  const selectCalendarDate = (date: Date) => {
    const day = date.getDay();
    setSchedule((current) => ({
      ...current,
      startDate: format(date, "yyyy-MM-dd"),
      daysOfWeek: current.daysOfWeek.includes(day) ? current.daysOfWeek : [...current.daysOfWeek, day].sort(),
    }));
  };
  const toggleWeekday = (day: number) => setSchedule((current) => ({
    ...current,
    daysOfWeek: current.daysOfWeek.includes(day)
      ? current.daysOfWeek.filter((item) => item !== day)
      : [...current.daysOfWeek, day].sort(),
  }));

  const scheduleText = preview
    ? `${schedule.daysOfWeek.map((day) => WEEKDAYS.find((item) => item.day === day)?.full).filter(Boolean).join(", ")} | ${schedule.startTime}-${schedule.endTime} | ${preview.sessions.length} buổi`
    : "Chưa đủ điều kiện để tạo lịch";

  return (
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); onClose(); }} className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 overflow-y-auto bg-neutral-50/80 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] xl:overflow-hidden">
        <div className="space-y-4 border-b border-neutral-200 p-4 sm:p-5 xl:overflow-y-auto xl:border-b-0 xl:border-r">
          <Section icon={<BookOpen size={18} />} title="Thông tin lớp" description="Thông tin nhận diện và trạng thái vận hành của lớp.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><FieldLabel htmlFor="demo-class-name" required>Tên lớp</FieldLabel><input id="demo-class-name" className={FIELD_CLASS} defaultValue="IELTS Foundation 08" /></div>
              <div><FieldLabel htmlFor="demo-class-course" required>Khóa học</FieldLabel><select id="demo-class-course" className={FIELD_CLASS} defaultValue="ielts"><option value="">Chọn khóa học</option><option value="ielts">IELTS Foundation</option><option value="toeic">TOEIC Essentials</option></select></div>
              <div><FieldLabel htmlFor="demo-class-status">Trạng thái</FieldLabel><select id="demo-class-status" className={FIELD_CLASS}><option>Đang hoạt động</option><option>Đã kết thúc</option><option>Đã hủy</option></select></div>
            </div>
          </Section>
          <Section icon={<UsersRound size={18} />} title="Phân công" description="Chọn môn học và giáo viên phụ trách lớp.">
            <div className="space-y-5">
              <ChipGroup label="Môn học *" options={["Tiếng Anh", "IELTS", "Giao tiếp"]} />
              <ChipGroup label="Giáo viên phụ trách" options={["Cô An", "Thầy Bình", "Cô Mai"]} />
              <p className="rounded-xl bg-neutral-50 px-3 py-2.5 text-xs leading-5 text-neutral-500">Có thể chọn nhiều giáo viên. Quyền phân công hiện tại được giữ nguyên khi triển khai.</p>
            </div>
          </Section>
        </div>

        <div className="space-y-4 p-4 sm:p-5 xl:overflow-y-auto">
          <Section icon={<MapPin size={18} />} title="Lịch và địa điểm" description="Mô tả lịch được đồng bộ từ lịch thông minh hoặc nhập thủ công.">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,.6fr)]">
              <div><FieldLabel htmlFor="demo-class-schedule">Lịch học (mô tả)</FieldLabel><input id="demo-class-schedule" className={FIELD_CLASS} value={smartSchedule ? scheduleText : undefined} defaultValue={smartSchedule ? undefined : "Thứ 3 và Thứ 5, 18:00-19:30"} readOnly={smartSchedule} /></div>
              <div><FieldLabel htmlFor="demo-class-location">Địa điểm</FieldLabel><input id="demo-class-location" className={FIELD_CLASS} defaultValue="Phòng 201" /></div>
            </div>
          </Section>

          <Section icon={<Sparkles size={18} />} title="Lịch học thông minh" description="Chọn quy tắc một lần, hệ thống tự sinh các buổi học và hiển thị ngay trên lịch tháng.">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary-800"><CalendarDays size={16} /> Tự động sinh buổi học lặp theo tuần</div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-neutral-700"><input type="checkbox" checked={smartSchedule} onChange={(event) => setSmartSchedule(event.target.checked)} className="size-4 accent-primary-600" />Đang bật</label>
            </div>

            {smartSchedule ? (
              <div className="grid gap-4 2xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div><FieldLabel htmlFor="demo-recurrence-start" required>Ngày bắt đầu</FieldLabel><input id="demo-recurrence-start" type="date" className={FIELD_CLASS} value={schedule.startDate} onChange={(event) => updateStartDate(event.target.value)} /></div>
                  <div>
                    <span className="mb-2 block text-xs font-bold text-neutral-700">Các thứ trong tuần *</span>
                    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Chọn thứ trong tuần">
                      {WEEKDAYS.map(({ day, short, full }) => {
                        const active = schedule.daysOfWeek.includes(day);
                        return <button key={day} type="button" aria-label={full} aria-pressed={active} onClick={() => toggleWeekday(day)} className={`min-h-9 cursor-pointer rounded-lg border text-xs font-bold transition ${active ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300"}`}>{short}</button>;
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3"><div><FieldLabel htmlFor="demo-start-time" required>Bắt đầu</FieldLabel><input id="demo-start-time" type="time" className={FIELD_CLASS} value={schedule.startTime} onChange={(event) => setSchedule((current) => ({ ...current, startTime: event.target.value }))} /></div><div><FieldLabel htmlFor="demo-end-time" required>Kết thúc</FieldLabel><input id="demo-end-time" type="time" className={FIELD_CLASS} value={schedule.endTime} onChange={(event) => setSchedule((current) => ({ ...current, endTime: event.target.value }))} /></div></div>
                  <div><FieldLabel htmlFor="demo-session-count" required>Tổng số buổi</FieldLabel><input id="demo-session-count" type="number" min={1} max={120} className={FIELD_CLASS} value={schedule.sessionCount} onChange={(event) => setSchedule((current) => ({ ...current, sessionCount: Number(event.target.value) }))} /></div>
                  <div className="rounded-xl border border-success-100 bg-success-50 p-3 text-xs leading-5 text-success-900"><strong className="block text-sm">{preview?.sessions.length ?? 0} buổi dự kiến</strong>{preview ? `Buổi đầu ${format(preview.sessions[0].startAt, "dd/MM/yyyy")}, bế giảng ${format(preview.endDate, "dd/MM/yyyy")}.` : "Hãy điền đủ điều kiện để xem trước."}</div>
                </div>

                <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div><p className="text-xs font-semibold text-neutral-500">Lịch tháng tương tác</p><h4 className="text-base font-black capitalize text-neutral-950">Tháng {format(visibleMonth, "MM / yyyy")}</h4></div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" onClick={() => setVisibleMonth(startOfMonth(new Date(`${schedule.startDate}T00:00:00`)))}>Tháng bắt đầu</Button>
                      <button type="button" aria-label="Tháng trước" onClick={() => setVisibleMonth((month) => subMonths(month, 1))} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-neutral-300 text-neutral-600 transition hover:border-primary-300 hover:text-primary-700"><ChevronLeft size={17} /></button>
                      <button type="button" aria-label="Tháng sau" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-neutral-300 text-neutral-600 transition hover:border-primary-300 hover:text-primary-700"><ChevronRight size={17} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 border-b border-neutral-200 pb-2 text-center text-[10px] font-bold uppercase tracking-wide text-neutral-400">{WEEKDAYS.map((day) => <span key={day.day}>{day.short}</span>)}</div>
                  <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5">
                    {monthDays.map((date) => {
                      const key = format(date, "yyyy-MM-dd");
                      const sessionNumber = sessionsByDate.get(key);
                      const isStart = key === schedule.startDate;
                      const inMonth = isSameMonth(date, visibleMonth);
                      return (
                        <button key={key} type="button" onClick={() => selectCalendarDate(date)} aria-label={`Chọn ngày bắt đầu ${format(date, "dd/MM/yyyy")}`} aria-pressed={isStart} className={`group relative min-h-14 cursor-pointer rounded-lg border p-1.5 text-left transition sm:min-h-16 ${isStart ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100" : sessionNumber ? "border-success-200 bg-success-50 hover:border-success-300" : "border-transparent hover:border-primary-200 hover:bg-neutral-50"} ${inMonth ? "text-neutral-800" : "text-neutral-300"}`}>
                          <span className="text-xs font-bold">{format(date, "d")}</span>
                          {sessionNumber && <span className="mt-1 flex items-center gap-1 text-[9px] font-bold text-success-700 sm:text-[10px]"><Clock3 size={10} /> Buổi {sessionNumber}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-neutral-500">Bấm một ngày để đặt lại ngày bắt đầu. Nếu thứ tương ứng chưa được chọn, hệ thống sẽ tự thêm vào quy tắc.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">Lịch thông minh đang tắt. Trường mô tả lịch học phía trên vẫn có thể nhập thủ công.</div>
            )}
          </Section>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:px-5">
        <p className="text-xs text-neutral-500"><strong className="text-neutral-700">Demo UI</strong> · Lịch tương tác thật, không ghi dữ liệu</p>
        <div className="flex gap-2"><Button onClick={onClose}>Hủy</Button><Button type="submit" variant="primary">Tạo lớp học</Button></div>
      </footer>
    </form>
  );
}
