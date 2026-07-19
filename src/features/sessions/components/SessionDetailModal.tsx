import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SessionStatus } from "@/types/academic";
import type { TimetableSession } from "@/features/sessions/components/TimetableGrid";

interface SessionDetailModalProps {
  session: TimetableSession | null;
  onClose: () => void;
  readOnly?: boolean;
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

export function SessionDetailModal({
  session,
  onClose,
  readOnly = false,
  onReschedule,
  onStatusChange,
  isPending = false,
}: SessionDetailModalProps) {
  return (
    <Modal
      open={!!session}
      onClose={onClose}
      title={session?.className ?? ""}
      description={session ? session.title : undefined}
    >
      {session && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone={STATUS_TONE[session.status]}>{STATUS_LABEL[session.status]}</StatusBadge>
            {session.location && <span className="text-sm text-neutral-500">{session.location}</span>}
          </div>

          {readOnly ? (
            <div className="rounded-input border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              {format(session.startAt.toDate(), "EEEE, dd/MM/yyyy")} · {format(session.startAt.toDate(), "HH:mm")} -{" "}
              {format(session.endAt.toDate(), "HH:mm")}
            </div>
          ) : (
            <div className="grid gap-3">
              <div>
                <label htmlFor="session-detail-start" className="mb-1 block text-sm font-medium text-neutral-700">
                  Thời gian bắt đầu
                </label>
                <input
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
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500 disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-neutral-500">Đổi giờ sẽ tự chuyển trạng thái sang "Đã đổi lịch".</p>
              </div>

              <div>
                <label htmlFor="session-detail-status" className="mb-1 block text-sm font-medium text-neutral-700">
                  Trạng thái
                </label>
                <select
                  id="session-detail-status"
                  value={session.status}
                  disabled={isPending}
                  onChange={(event) => onStatusChange?.(session.id, event.target.value as SessionStatus)}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500 disabled:opacity-50"
                >
                  <option value="scheduled">Đã lên lịch</option>
                  <option value="rescheduled">Đã đổi lịch</option>
                  <option value="cancelled">Đã hủy</option>
                  <option value="completed">Đã học</option>
                </select>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
