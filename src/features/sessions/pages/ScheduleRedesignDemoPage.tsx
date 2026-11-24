import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { FitWeekTimetable } from "@/features/sessions/components/FitWeekTimetable";
import { SessionDetailModal } from "@/features/sessions/components/SessionDetailModal";
import type { TimetableSession } from "@/features/sessions/components/TimetableGrid";
import type { SessionStatus, StudentDoc } from "@/types/academic";

const DAYS = Array.from({ length: 7 }, (_, index) => new Date(2026, 7, 10 + index));
const TODAY = DAYS[2];

function timestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function demoSession(input: {
  id: string;
  day: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  className: string;
  status?: SessionStatus;
}): TimetableSession {
  const startAt = new Date(2026, 7, 10 + input.day, input.startHour, input.startMinute);
  const endAt = new Date(2026, 7, 10 + input.day, input.endHour, input.endMinute);
  const stamp = timestamp(startAt);
  return {
    id: input.id,
    classId: input.id.endsWith("b") ? "class-b" : "class-a",
    className: input.className,
    classLocation: "TAC - 1711 CT2B",
    courseName: "Tiền tiểu học 2026",
    subjectNames: ["Tiền tiểu học"],
    teacherNames: ["Quỳnh Chi Nguyễn"],
    studentCount: 6,
    title: "Buổi học theo chương trình",
    startAt: stamp,
    endAt: timestamp(endAt),
    location: "TAC - 1711 CT2B",
    status: input.status ?? "scheduled",
    note: "Chuẩn bị bộ học liệu nhận biết chữ cái.",
    makeUpForSessionId: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

const INITIAL_SESSIONS = [
  demoSession({ id: "session-a", day: 2, startHour: 8, startMinute: 0, endHour: 9, endMinute: 25, className: "Tiền tiểu học - A 2026" }),
  demoSession({ id: "session-b", day: 2, startHour: 9, startMinute: 35, endHour: 11, endMinute: 0, className: "Tiền tiểu học - B 2026" }),
  demoSession({ id: "session-evening-a", day: 0, startHour: 19, startMinute: 45, endHour: 21, endMinute: 10, className: "Tiền tiểu học - A 2026" }),
  demoSession({ id: "session-evening-b", day: 3, startHour: 19, startMinute: 45, endHour: 21, endMinute: 10, className: "Tiền tiểu học - B 2026", status: "rescheduled" }),
];

function demoStudent(id: string, fullName: string, nickname = ""): StudentDoc & { id: string } {
  const stamp = timestamp(new Date(2026, 0, 1));
  return {
    id,
    studentCode: id,
    fullName,
    nickname,
    dateOfBirth: "2020-01-01",
    parentUids: [],
    currentClassIds: ["class-a", "class-b"],
    teacherIds: [],
    status: "active",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

const STUDENTS = [
  demoStudent("HS001", "Nguyễn Gia Minh"),
  demoStudent("HS014", "Trần Minh Anh"),
  demoStudent("HS021", "Lê Khánh Linh"),
  demoStudent("HS032", "Phạm Bảo Ngọc"),
  demoStudent("HS045", "Vũ Hoàng Nam"),
  demoStudent("HS052", "Đỗ Yến Nhi"),
];

export default function ScheduleRedesignDemoPage() {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const updateSession = (id: string, changes: Partial<TimetableSession>) => {
    setSessions((current) => current.map((session) => session.id === id ? { ...session, ...changes } : session));
  };

  return (
    <div className="min-h-[100dvh] bg-neutral-50 pb-10">
      <div className="border-b border-primary-100 bg-primary-50 px-4 py-2.5 text-center text-xs font-semibold text-primary-800">
        Bản demo dùng trực tiếp component production. Dữ liệu minh họa, không kết nối Firestore.
      </div>
      <main className="mx-auto max-w-[1800px] px-3 py-5 sm:px-5 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-primary-700">Giao diện đã áp dụng</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">Lịch học gọn, không tràn ca</h1>
            <p className="mt-1.5 text-sm text-neutral-500">Nhấn vào một lớp để xem thông tin và danh sách học sinh.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Tuần trước" className="grid size-10 place-items-center rounded-input border border-neutral-300 bg-neutral-0 text-neutral-600"><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Tuần sau" className="grid size-10 place-items-center rounded-input border border-neutral-300 bg-neutral-0 text-neutral-600"><ChevronRight size={18} aria-hidden="true" /></button>
            <button type="button" className="min-h-10 rounded-input border border-neutral-300 bg-neutral-0 px-3 text-xs font-bold text-neutral-700">Hôm nay</button>
          </div>
        </div>

        <section className="overflow-hidden rounded-card border border-neutral-200 bg-neutral-0 shadow-[var(--shadow-1)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5">
            <strong className="text-sm tabular-nums text-neutral-900">10/08 - 16/08/2026</strong>
            <div className="flex flex-wrap gap-3 text-2xs font-semibold text-neutral-600">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-info-500" />Đã lên lịch</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-warning-500" />Đổi lịch</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-success-500" />Đã học</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-danger-500" />Đã hủy</span>
            </div>
          </header>
          <FitWeekTimetable
            days={DAYS}
            sessions={sessions}
            today={TODAY}
            onSessionClick={(session) => setSelectedSessionId(session.id)}
            onSessionDrop={(session, startAt, endAt) => updateSession(session.id, {
              startAt: timestamp(startAt),
              endAt: timestamp(endAt),
              status: "rescheduled",
            })}
          />
        </section>
      </main>

      <SessionDetailModal
        session={selectedSession}
        students={STUDENTS}
        onClose={() => setSelectedSessionId(null)}
        onReschedule={(id, startAt, endAt) => updateSession(id, {
          startAt: timestamp(startAt),
          endAt: timestamp(endAt),
          status: "rescheduled",
        })}
        onStatusChange={(id, status) => updateSession(id, { status })}
      />
    </div>
  );
}
