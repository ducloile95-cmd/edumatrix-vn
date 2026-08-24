import { useMemo, useState } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { BookOpen, CalendarDays, Clock3, MapPin, Search, UserCheck, Users, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROUTES, classroomSessionPath } from "@/constants/routes";
import { studentLabel } from "@/utils/student";
import type { SessionStatus, StudentDoc } from "@/types/academic";
import type { TimetableSession } from "@/features/sessions/components/TimetableGrid";

type SessionStudent = StudentDoc & { id: string };

interface SessionDetailModalProps {
  session: TimetableSession | null;
  onClose: () => void;
  readOnly?: boolean;
  students?: SessionStudent[];
  studentsLoading?: boolean;
  onReschedule?: (sessionId: string, startAt: Date, endAt: Date) => void;
  onStatusChange?: (sessionId: string, status: SessionStatus) => void;
  isPending?: boolean;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Đã lên lịch",
  rescheduled: "Đã đổi lịch",
  cancelled: "Đã hủy",
  completed: "Đã học",
};
const STATUS_TONE: Record<SessionStatus, "info" | "warning" | "success" | "danger"> = {
  scheduled: "info",
  rescheduled: "warning",
  completed: "success",
  cancelled: "danger",
};

function DetailItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-input border border-neutral-200 bg-neutral-0 p-3.5">
      <dt className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
        <Icon size={15} className="text-primary-600" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-bold leading-5 text-neutral-900">{value}</dd>
    </div>
  );
}

export function SessionDetailModal({
  session,
  onClose,
  readOnly = false,
  students = [],
  studentsLoading = false,
  onReschedule,
  onStatusChange,
  isPending = false,
}: SessionDetailModalProps) {
  const [query, setQuery] = useState("");
  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return students;
    return students.filter((student) => `${student.fullName} ${student.nickname ?? ""} ${student.studentCode}`.toLocaleLowerCase("vi").includes(normalized));
  }, [query, students]);

  const closeModal = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      open={!!session}
      onClose={closeModal}
      title={session?.className ?? ""}
      description={session ? `${format(session.startAt.toDate(), "EEEE, dd/MM/yyyy", { locale: vi })} · ${format(session.startAt.toDate(), "HH:mm")}-${format(session.endAt.toDate(), "HH:mm")}` : undefined}
      size={readOnly ? "sm" : "workspace"}
      bodyClassName={readOnly ? undefined : "overflow-y-auto bg-neutral-0 lg:overflow-hidden"}
    >
      {session && (readOnly ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={STATUS_TONE[session.status]}>{STATUS_LABEL[session.status]}</StatusBadge>
            {(session.location || session.classLocation) && <span className="text-sm text-neutral-500">{session.location || session.classLocation}</span>}
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailItem icon={CalendarDays} label="Ngày học" value={format(session.startAt.toDate(), "EEEE, dd/MM/yyyy", { locale: vi })} />
            <DetailItem icon={Clock3} label="Thời gian" value={`${format(session.startAt.toDate(), "HH:mm")}-${format(session.endAt.toDate(), "HH:mm")}`} />
            <DetailItem icon={MapPin} label="Phòng học" value={session.location || session.classLocation || "Chưa có phòng học"} />
            <DetailItem icon={UserCheck} label="Giáo viên" value={session.teacherNames?.join(", ") || "Chưa phân công"} />
          </dl>
          {session.note && <p className="mt-4 rounded-input border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">{session.note}</p>}
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={closeModal} className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Đóng</button>
          </div>
        </div>
      ) : (
        <div className="min-h-full lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
          <section className="border-b border-neutral-200 bg-neutral-50/70 p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONE[session.status]}>{STATUS_LABEL[session.status]}</StatusBadge>
              <span className="text-xs font-semibold text-neutral-500">Mã buổi: {session.id}</span>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              <DetailItem icon={CalendarDays} label="Ngày học" value={format(session.startAt.toDate(), "EEEE, dd/MM/yyyy", { locale: vi })} />
              <DetailItem icon={Clock3} label="Thời gian" value={`${format(session.startAt.toDate(), "HH:mm")}-${format(session.endAt.toDate(), "HH:mm")}`} />
              <DetailItem icon={BookOpen} label="Khóa học" value={session.courseName || session.subjectNames?.join(", ") || session.title || "Chưa gắn khóa học"} />
              <DetailItem icon={MapPin} label="Phòng học" value={session.location || session.classLocation || "Chưa có phòng học"} />
              <DetailItem icon={UserCheck} label="Giáo viên" value={session.teacherNames?.join(", ") || "Chưa phân công"} />
              <DetailItem icon={Users} label="Sĩ số" value={studentsLoading ? "Đang tải..." : `${students.length} học sinh`} />
            </dl>

            <div className="mt-4 grid gap-3 rounded-input border border-neutral-200 bg-neutral-0 p-4">
              <div>
                <label htmlFor="session-detail-start" className="mb-1 block text-xs font-bold text-neutral-700">Thời gian bắt đầu</label>
                <input
                  key={`${session.id}-${session.startAt.toMillis()}`}
                  id="session-detail-start"
                  type="datetime-local"
                  defaultValue={format(session.startAt.toDate(), "yyyy-MM-dd'T'HH:mm")}
                  disabled={isPending}
                  onBlur={(event) => {
                    if (!event.target.value || !onReschedule) return;
                    const nextStart = new Date(event.target.value);
                    if (nextStart.getTime() === session.startAt.toMillis()) return;
                    const duration = session.endAt.toMillis() - session.startAt.toMillis();
                    onReschedule(session.id, nextStart, new Date(nextStart.getTime() + duration));
                  }}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-neutral-500">Đổi giờ sẽ chuyển trạng thái sang "Đã đổi lịch".</p>
              </div>
              <div>
                <label htmlFor="session-detail-status" className="mb-1 block text-xs font-bold text-neutral-700">Trạng thái</label>
                <select
                  id="session-detail-status"
                  value={session.status}
                  disabled={isPending}
                  onChange={(event) => onStatusChange?.(session.id, event.target.value as SessionStatus)}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:opacity-50"
                >
                  <option value="scheduled">Đã lên lịch</option>
                  <option value="rescheduled">Đã đổi lịch</option>
                  <option value="cancelled">Đã hủy</option>
                  <option value="completed">Đã học</option>
                </select>
              </div>
            </div>

            {session.note && (
              <div className="mt-4 rounded-input border border-neutral-200 bg-neutral-0 p-4">
                <p className="text-xs font-bold text-neutral-700">Ghi chú buổi học</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{session.note}</p>
              </div>
            )}
          </section>

          <section className="bg-neutral-0 lg:grid lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)_auto]">
            <header className="border-b border-neutral-200 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Danh sách học sinh</h3>
                  <p className="mt-1 text-xs text-neutral-500">Tìm học sinh hoặc chuyển sang màn hình nghiệp vụ của buổi học.</p>
                </div>
                <span className="text-xs font-semibold text-neutral-500">{studentsLoading ? "Đang tải..." : `${students.length} học sinh`}</span>
              </div>
              <label className="relative mt-3 block">
                <span className="sr-only">Tìm học sinh</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm theo tên hoặc mã học sinh"
                  className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:bg-neutral-0 focus:ring-2 focus:ring-primary-100"
                />
              </label>
            </header>

            <div className="px-4 py-2 sm:px-6 lg:min-h-0 lg:overflow-y-auto">
              {studentsLoading ? (
                <div className="grid gap-2 py-3" aria-label="Đang tải danh sách học sinh">
                  {[1, 2, 3, 4].map((item) => <div key={item} className="h-14 animate-pulse rounded-input bg-neutral-100 motion-reduce:animate-none" />)}
                </div>
              ) : filteredStudents.length ? (
                <div className="divide-y divide-neutral-100">
                  {filteredStudents.map((student) => (
                    <article key={student.id} className="flex min-w-0 items-center gap-3 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-extrabold text-primary-700" aria-hidden="true">
                        {student.fullName.split(" ").slice(-2).map((part) => part[0]).join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-neutral-900">{studentLabel(student)}</h4>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">{student.studentCode} · {student.status === "active" ? "Đang học" : "Ngừng học"}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Users className="mx-auto text-neutral-300" size={28} aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-neutral-700">{query ? "Không tìm thấy học sinh" : "Lớp chưa có học sinh"}</p>
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-6">
              <button type="button" onClick={closeModal} className="min-h-touch rounded-input border border-neutral-300 bg-neutral-0 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50">Đóng</button>
              <div className="flex flex-wrap gap-2">
                <Link to={classroomSessionPath(session.id)} className="inline-flex min-h-touch items-center justify-center rounded-input border border-primary-200 bg-neutral-0 px-4 text-sm font-bold text-primary-700 hover:bg-primary-50">Mở sổ lớp</Link>
                <Link to={`${ROUTES.STAFF_ATTENDANCE}?session=${session.id}`} className="inline-flex min-h-touch items-center justify-center rounded-input bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800">Điểm danh</Link>
              </div>
            </footer>
          </section>
        </div>
      ))}
    </Modal>
  );
}
