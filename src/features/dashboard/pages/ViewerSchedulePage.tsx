import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { addDays, addWeeks, endOfDay, endOfWeek, format, startOfDay, startOfWeek, subDays } from "date-fns";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getStudent } from "@/services/firestore/students";
import { getClass } from "@/services/firestore/classes";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { TimetableGrid, type TimetableSession } from "@/features/sessions/components/TimetableGrid";
import { SessionDetailModal } from "@/features/sessions/components/SessionDetailModal";

type ViewerTimetableView = "day" | "week";

const WINDOW_PAST_DAYS = 14;
const WINDOW_FUTURE_DAYS = 60;

export default function ViewerSchedulePage() {
  const { userDoc } = useAuth();
  const [view, setView] = useState<ViewerTimetableView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [childFilter, setChildFilter] = useState<string | "all">("all");
  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);
  const today = useMemo(() => new Date(), []);

  const studentIds = userDoc?.studentIds ?? [];
  const studentsQuery = useQueries({
    queries: studentIds.map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })),
  });
  const students = studentsQuery.map((q) => q.data).filter((s): s is NonNullable<typeof s> => !!s);
  const classIds = useMemo(
    () => [...new Set(students.flatMap((student) => student.currentClassIds ?? []))],
    [students],
  );

  // getClass la doc-read don le, duoc phep theo Firestore Rules (viewer chi list duoc session
  // theo classId da biet, khong list duoc toan bo collection classes) - khong phai truy van moi,
  // chi ap dung ham da co san cho tung classId cua con minh (cung mo hinh voi listSessionsByClass ben duoi).
  const classesQuery = useQueries({
    queries: classIds.map((id) => ({ queryKey: ["viewer-class", id], queryFn: () => getClass(id) })),
  });
  const classById = useMemo(
    () => new Map(classesQuery.map((q, index) => [classIds[index], q.data])),
    [classesQuery, classIds],
  );

  const windowFrom = useMemo(() => subDays(today, WINDOW_PAST_DAYS), [today]);
  const windowTo = useMemo(() => addDays(today, WINDOW_FUTURE_DAYS), [today]);
  const sessionsQuery = useQueries({
    queries: classIds.map((id) => ({
      queryKey: ["viewer-sessions", id],
      queryFn: () => listSessionsByClass(id, windowFrom, windowTo),
    })),
  });
  const isLoading = studentsQuery.some((q) => q.isLoading) || sessionsQuery.some((q) => q.isLoading);

  const classToStudentNames = useMemo(() => {
    const map = new Map<string, string[]>();
    students.forEach((student) => {
      (student.currentClassIds ?? []).forEach((classId) => {
        map.set(classId, [...(map.get(classId) ?? []), student.fullName]);
      });
    });
    return map;
  }, [students]);

  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(anchor), to: endOfDay(anchor) };
    return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
  }, [anchor, view]);

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    const list: Date[] = [];
    let cursor = range.from;
    while (cursor <= range.to) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [anchor, range, view]);

  const timetableSessions: TimetableSession[] = useMemo(() => {
    const flat = sessionsQuery.flatMap((q) => q.data ?? []);
    return flat
      .filter((session) => {
        const start = session.startAt.toDate();
        if (start < range.from || start > range.to) return false;
        if (childFilter === "all") return true;
        const names = classToStudentNames.get(session.classId) ?? [];
        const childName = students.find((s) => s.id === childFilter)?.fullName;
        return childName ? names.includes(childName) : true;
      })
      .map((session) => {
        const klass = classById.get(session.classId);
        const names = classToStudentNames.get(session.classId) ?? [];
        const className = klass?.name ?? session.title;
        return { ...session, className: names.length > 0 ? `${className} · ${names.join(", ")}` : className };
      });
  }, [sessionsQuery, range, childFilter, classToStudentNames, students, classById]);

  function shiftPeriod(dir: 1 | -1) {
    if (view === "day") setAnchor((prev) => addDays(prev, dir));
    else setAnchor((prev) => addWeeks(prev, dir));
  }
  function goToday() {
    setAnchor(new Date());
  }

  const periodLabel = view === "day" ? format(anchor, "dd/MM/yyyy") : `${format(range.from, "dd/MM")} – ${format(range.to, "dd/MM/yyyy")}`;

  return (
    <ViewerShell>
      <PageHeader title="Lịch học" description="Các buổi học sắp tới của con bạn." />

      {students.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setChildFilter("all")}
            className={`min-h-touch rounded-full border px-3.5 text-xs font-bold transition ${
              childFilter === "all" ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 bg-white text-neutral-600"
            }`}
          >
            Tất cả
          </button>
          {students.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => setChildFilter(student.id)}
              className={`min-h-touch rounded-full border px-3.5 text-xs font-bold transition ${
                childFilter === student.id ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 bg-white text-neutral-600"
              }`}
            >
              {student.fullName}
            </button>
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <button type="button" aria-label="Kỳ trước" onClick={() => shiftPeriod(-1)} className="grid size-8 place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700">
                ‹
              </button>
              <button type="button" aria-label="Kỳ tiếp" onClick={() => shiftPeriod(1)} className="grid size-8 place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700">
                ›
              </button>
            </div>
            <span className="min-w-[120px] text-sm font-bold text-neutral-900">{periodLabel}</span>
            <button type="button" onClick={goToday} className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              Hôm nay
            </button>
          </div>
          <div className="grid min-h-touch grid-cols-2 gap-1 rounded-input border border-neutral-300 bg-neutral-50 p-1">
            {([
              { value: "day", label: "Ngày" },
              { value: "week", label: "Tuần" },
            ] as { value: ViewerTimetableView; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`rounded-[7px] px-3 text-xs font-semibold transition ${
                  view === value ? "bg-primary-500 text-white shadow-[0_4px_12px_rgba(51,102,240,.18)]" : "text-neutral-600 hover:bg-white hover:text-primary-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 sm:p-5">
            <LoadingSkeleton rows={6} />
          </div>
        ) : (
          <TimetableGrid days={days} sessions={timetableSessions} today={today} onSessionClick={setSelectedSession} />
        )}
      </section>

      <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} readOnly />
    </ViewerShell>
  );
}
