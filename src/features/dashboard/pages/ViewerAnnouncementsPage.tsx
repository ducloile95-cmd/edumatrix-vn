import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BellRing, CalendarClock, ClipboardList, Megaphone } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ViewerStudentSwitcher } from "@/features/students/components/ViewerStudentSwitcher";
import { useViewerStudentSelection } from "@/features/students/hooks/useViewerStudentSelection";
import { listAnnouncementsByStudent } from "@/services/firestore/announcements";
import { getStudent } from "@/services/firestore/students";
import type { AnnouncementDoc, AnnouncementType } from "@/types/academic";

type Announcement = AnnouncementDoc & { id: string };

const ANNOUNCEMENT_META: Record<AnnouncementType, {
  label: string;
  icon: typeof BellRing;
  tone: string;
}> = {
  attendance_alert: { label: "Chuyên cần", icon: BellRing, tone: "bg-danger-50 text-danger-700" },
  schedule_change: { label: "Thay đổi lịch", icon: CalendarClock, tone: "bg-warning-50 text-warning-700" },
  homework_reminder: { label: "Bài tập", icon: ClipboardList, tone: "bg-primary-50 text-primary-700" },
  session_summary: { label: "Buổi học", icon: Megaphone, tone: "bg-info-50 text-info-700" },
};

export default function ViewerAnnouncementsPage() {
  const { userDoc } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];
  const studentQueries = useQueries({
    queries: studentIds.map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })),
  });
  const students = studentQueries.flatMap((query) => query.data ? [query.data] : []);
  const { selectedStudentId, selectStudent } = useViewerStudentSelection(students);
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const activeStudentId = selectedStudent?.id ?? "";
  const announcements = useQuery({
    queryKey: ["announcements", activeStudentId],
    queryFn: () => listAnnouncementsByStudent(activeStudentId, 50),
    enabled: !!activeStudentId,
  });
  const items = useMemo(() => [...(announcements.data ?? [])]
    .sort((left, right) => right.createdAt.toMillis() - left.createdAt.toMillis()), [announcements.data]);

  const isLoading = studentQueries.some((query) => query.isLoading) || announcements.isLoading;
  const firstError = studentQueries.find((query) => query.error)?.error ?? announcements.error;
  const retry = () => {
    studentQueries.forEach((query) => query.refetch());
    announcements.refetch();
  };

  return (
    <>
      {isLoading && <LoadingSkeleton rows={4} />}
      {!isLoading && firstError && (
        <ErrorState message="Không thể tải thông báo. Vui lòng kiểm tra kết nối và thử lại." onRetry={retry} />
      )}
      {!isLoading && !firstError && !selectedStudent && (
        <EmptyState title="Chưa liên kết học sinh" description="Tài khoản phụ huynh cần được liên kết với học sinh để nhận thông báo." />
      )}
      {!isLoading && !firstError && selectedStudent && (
        <div className="space-y-4 pb-5">
          <ViewerStudentSwitcher students={students} selectedStudentId={selectedStudent.id} onSelect={selectStudent} />

          <header>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Thông báo</h2>
            <p className="mt-1.5 text-sm text-neutral-500">Cập nhật mới nhất từ giáo viên và nhà trường.</p>
          </header>

          {items.length === 0 ? (
            <EmptyState title="Chưa có thông báo mới" description="Thông báo từ giáo viên và nhà trường sẽ hiển thị ở đây." />
          ) : (
            <section aria-label="Danh sách thông báo" className="space-y-2.5">
              {items.map((item) => <AnnouncementCard key={item.id} item={item} />)}
            </section>
          )}
        </div>
      )}
    </>
  );
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const meta = ANNOUNCEMENT_META[item.type];
  const Icon = meta.icon;

  return (
    <article className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_4px_18px_rgba(37,61,124,.035)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-input ${meta.tone}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className={`rounded-full px-2 py-1 text-2xs font-bold ${meta.tone}`}>{meta.label}</span>
            <time dateTime={item.createdAt.toDate().toISOString()} className="text-2xs font-medium tabular-nums text-neutral-500">
              {format(item.createdAt.toDate(), "HH:mm · dd/MM/yyyy")}
            </time>
          </div>
          <h3 className="mt-2 text-base font-bold text-neutral-900">{item.title || "Thông báo"}</h3>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">{item.message}</p>
        </div>
      </div>
    </article>
  );
}
