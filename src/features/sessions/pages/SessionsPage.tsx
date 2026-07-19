import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useToast } from "@/components/feedback/toastContext";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { createSessions, listSessions, updateSession, type CreateSessionsInput } from "@/services/firestore/sessions";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { CreateSessionModal } from "@/features/sessions/components/CreateSessionModal";
import { FitWeekTimetable } from "@/features/sessions/components/FitWeekTimetable";
import { TimetableGrid, type TimetableSession } from "@/features/sessions/components/TimetableGrid";
import { MonthGrid } from "@/features/sessions/components/MonthGrid";
import { SessionDetailModal } from "@/features/sessions/components/SessionDetailModal";
import type { SessionStatus } from "@/types/academic";

type TimetableView = "fit-week" | "day" | "week" | "month";

/**
 * Lich hoc (Staff) - chi con Timetable (khong con tab "Danh sach lop": nhanh do da gop vao
 * ClassesList.tsx / trang Lop hoc). classId tren URL (?classId=...) duoc trang Lop hoc dung khi
 * bam "Xem lich" de mo thang vao day da loc san theo lop, khong can state trung gian giua 2 trang.
 */
export default function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [timetableView, setTimetableView] = useState<TimetableView>("fit-week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [classFilter, setClassFilter] = useState<{ id: string; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const today = useMemo(() => new Date(), []);

  const range = useMemo(() => {
    if (timetableView === "day") return { from: startOfDay(anchor), to: endOfDay(anchor) };
    if (timetableView === "month") {
      return {
        from: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
        to: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
      };
    }
    return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
  }, [anchor, timetableView]);

  const days = useMemo(() => {
    if (timetableView === "day") return [anchor];
    if (timetableView === "month") return [];
    const list: Date[] = [];
    let cursor = range.from;
    while (cursor <= range.to) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [anchor, range, timetableView]);

  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  // courses/subjects/teachers: chi de lam giau the buoi hoc trong FitWeekTimetable (course/mon
  // hoc/giao vien/si so) - tai dung dung queryKey voi ClassesList/ClassForm nen chia se cache.
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses, staleTime: 60_000 });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: listSubjects, staleTime: 60_000 });
  const teachersQuery = useQuery({
    queryKey: ["users", "teacher"],
    queryFn: () => listUsersByRole(USER_ROLES.TEACHER),
    staleTime: 60_000,
  });
  const sessionsQuery = useQuery({
    queryKey: ["sessions", range.from.toISOString(), range.to.toISOString()],
    queryFn: () => listSessions(range.from, range.to),
  });

  // Doc ?classId= tren URL (tu nut "Xem lich" o trang Lop hoc) va tu dong loc Timetable theo lop
  // do ngay khi danh sach lop da tai xong, roi don URL cho gon.
  useEffect(() => {
    const classId = searchParams.get("classId");
    if (!classId || classFilter || !classesQuery.data) return;
    const klass = classesQuery.data.find((item) => item.id === classId);
    if (klass) {
      setClassFilter({ id: klass.id, name: klass.name });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, classesQuery.data, classFilter, setSearchParams]);

  const classById = useMemo(() => new Map((classesQuery.data ?? []).map((c) => [c.id, c])), [classesQuery.data]);
  const courseById = useMemo(() => new Map((coursesQuery.data ?? []).map((c) => [c.id, c])), [coursesQuery.data]);
  const subjectById = useMemo(() => new Map((subjectsQuery.data ?? []).map((s) => [s.id, s])), [subjectsQuery.data]);
  const teacherById = useMemo(() => new Map((teachersQuery.data ?? []).map((t) => [t.uid, t])), [teachersQuery.data]);

  const timetableSessions: TimetableSession[] = useMemo(() => {
    const list = (sessionsQuery.data ?? []).map((session) => {
      const klass = classById.get(session.classId);
      return {
        ...session,
        className: klass?.name ?? "Lớp đã xóa",
        classLocation: klass?.location,
        courseName: courseById.get(klass?.courseId ?? "")?.name,
        subjectNames: (klass?.subjectIds ?? [])
          .map((id) => subjectById.get(id)?.name)
          .filter((name): name is string => !!name),
        teacherNames: (klass?.teacherIds ?? [])
          .map((id) => teacherById.get(id)?.displayName)
          .filter((name): name is string => !!name),
        studentCount: klass?.studentIds.length,
      };
    });
    return classFilter ? list.filter((s) => s.classId === classFilter.id) : list;
  }, [sessionsQuery.data, classById, courseById, subjectById, teacherById, classFilter]);

  const monthSessionCounts = useMemo(() => {
    const map = new Map<string, number>();
    (sessionsQuery.data ?? []).forEach((session) => {
      if (classFilter && session.classId !== classFilter.id) return;
      const key = format(session.startAt.toDate(), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [sessionsQuery.data, classFilter]);

  const createMutation = useMutation({
    mutationFn: (input: CreateSessionsInput) => createSessions(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setCreateOpen(false);
      showToast({
        tone: "success",
        title: input.occurrences.length > 1 ? "Đã tạo lịch học" : "Đã tạo buổi học",
        description: `Đã tạo thành công ${input.occurrences.length} buổi học.`,
      });
    },
    onError: () => showToast({
      tone: "error",
      title: "Không thể tạo lịch học",
      description: "Vui lòng kiểm tra quyền truy cập và thử lại.",
    }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Parameters<typeof updateSession>[1] }) => updateSession(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      showToast({ tone: "success", title: "Đã cập nhật buổi học" });
    },
    onError: () => showToast({ tone: "error", title: "Không thể cập nhật buổi học" }),
  });

  function shiftPeriod(dir: 1 | -1) {
    if (timetableView === "day") setAnchor((prev) => addDays(prev, dir));
    else if (timetableView === "month") setAnchor((prev) => addMonths(prev, dir));
    else setAnchor((prev) => addWeeks(prev, dir));
  }

  function goToday() {
    setAnchor(new Date());
  }

  function handleSelectDateFromMonth(date: Date) {
    setAnchor(date);
    setTimetableView("day");
  }

  const periodLabel =
    timetableView === "day"
      ? format(anchor, "dd/MM/yyyy")
      : timetableView === "month"
        ? format(anchor, "'Tháng' M/yyyy")
        : `${format(range.from, "dd/MM")} - ${format(range.to, "dd/MM/yyyy")}`;

  return (
    <AppShell>
      <PageHeader
        actions={
          <Button variant="primary" onClick={() => { createMutation.reset(); setCreateOpen(true); }} icon={<Plus size={18} />}>
            Tạo buổi học
          </Button>
        }
      />

      <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <button type="button" aria-label="Kỳ trước" onClick={() => shiftPeriod(-1)} className="grid size-8 place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700">
                ‹
              </button>
              <button type="button" aria-label="Kỳ tiếp" onClick={() => shiftPeriod(1)} className="grid size-8 place-items-center rounded-input border border-neutral-300 text-neutral-600 hover:border-primary-300 hover:text-primary-700">
                ›
              </button>
            </div>
            <span className="min-w-[140px] text-sm font-bold text-neutral-900">{periodLabel}</span>
            <button type="button" onClick={goToday} className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              Hôm nay
            </button>
          </div>
          <div className="grid min-h-touch grid-cols-4 gap-1 rounded-input border border-neutral-300 bg-neutral-50 p-1">
            {([
              { value: "fit-week", label: "Fit week" },
              { value: "day", label: "Ngày" },
              { value: "week", label: "Time-grid" },
              { value: "month", label: "Tháng" },
            ] as { value: TimetableView; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTimetableView(value)}
                className={`rounded-[7px] px-3 text-xs font-semibold transition ${
                  timetableView === value ? "bg-primary-500 text-white shadow-[0_4px_12px_rgba(51,102,240,.18)]" : "text-neutral-600 hover:bg-white hover:text-primary-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {classFilter && (
          <div className="border-b border-neutral-100 px-4 py-2.5 sm:px-5">
            <button
              type="button"
              onClick={() => setClassFilter(null)}
              className="inline-flex min-h-touch items-center gap-2 rounded-full bg-primary-500 py-1 pl-3 pr-2 text-xs font-bold text-white"
            >
              Đang lọc theo lớp: {classFilter.name}
              <span className="grid size-[18px] place-items-center rounded-full bg-white/25">
                <X size={11} aria-hidden="true" />
              </span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-4 border-b border-neutral-100 px-4 py-2.5 text-[11px] text-neutral-600 sm:px-5">
          <span className="flex items-center gap-1.5"><span className="size-[9px] rounded-[3px] bg-info-500" />Đã lên lịch</span>
          <span className="flex items-center gap-1.5"><span className="size-[9px] rounded-[3px] bg-warning-500" />Đổi lịch / học bù</span>
          <span className="flex items-center gap-1.5"><span className="size-[9px] rounded-[3px] bg-success-500" />Đã học</span>
          <span className="flex items-center gap-1.5"><span className="size-[9px] rounded-[3px] bg-danger-500" />Đã hủy</span>
        </div>

        {sessionsQuery.isLoading && (
          <div className="p-4 sm:p-5">
            <LoadingSkeleton rows={6} />
          </div>
        )}
        {sessionsQuery.isError && (
          <div className="p-4 sm:p-5">
            <ErrorState message="Không tải được lịch học." onRetry={() => sessionsQuery.refetch()} />
          </div>
        )}
        {!sessionsQuery.isLoading && !sessionsQuery.isError && timetableView === "fit-week" && (
          <FitWeekTimetable
            days={days}
            sessions={timetableSessions}
            today={today}
            onSessionClick={setSelectedSession}
            onSessionDrop={(session, startAt, endAt) => {
              updateMutation.mutate({
                id: session.id,
                changes: {
                  startAt,
                  endAt,
                  status: "rescheduled",
                  note: "Lich hoc da duoc cap nhat bang thao tac keo tha.",
                },
              });
            }}
          />
        )}
        {!sessionsQuery.isLoading && !sessionsQuery.isError && timetableView !== "month" && timetableView !== "fit-week" && (
          <TimetableGrid days={days} sessions={timetableSessions} today={today} onSessionClick={setSelectedSession} />
        )}
        {!sessionsQuery.isLoading && !sessionsQuery.isError && timetableView === "month" && (
          <div className="p-4 sm:p-5">
            <MonthGrid month={anchor} sessionCountByDay={monthSessionCounts} today={today} onSelectDate={handleSelectDateFromMonth} />
          </div>
        )}
      </section>

      <SessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        isPending={updateMutation.isPending}
        onReschedule={(id, startAt, endAt) => {
          updateMutation.mutate({
            id,
            changes: { startAt, endAt, status: "rescheduled", note: "Lịch học đã được cập nhật." },
          });
          setSelectedSession(null);
        }}
        onStatusChange={(id, status: SessionStatus) => {
          updateMutation.mutate({ id, changes: { status } });
          setSelectedSession((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
        }}
      />

      <CreateSessionModal
        open={createOpen}
        classes={classesQuery.data ?? []}
        cancelledSessions={(sessionsQuery.data ?? []).filter((item) => item.status === "cancelled")}
        isPending={createMutation.isPending}
        isError={createMutation.isError}
        onClose={() => { createMutation.reset(); setCreateOpen(false); }}
        onSubmit={(input) => createMutation.mutate(input)}
      />
    </AppShell>
  );
}
