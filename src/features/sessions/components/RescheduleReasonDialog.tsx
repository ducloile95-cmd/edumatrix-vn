import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface RescheduleRequest {
  sessionId: string;
  className: string;
  previousStartAt: Date;
  previousEndAt: Date;
  startAt: Date;
  endAt: Date;
}

interface RescheduleReasonDialogProps {
  request: RescheduleRequest | null;
  isPending: boolean;
  isError: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

const DATE_TIME_FORMAT = "EEEE, dd/MM/yyyy · HH:mm";

export function RescheduleReasonDialog({ request, isPending, isError, onCancel, onConfirm }: RescheduleReasonDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [request]);

  const normalizedReason = reason.trim();

  return (
    <Modal
      open={!!request}
      onClose={() => { if (!isPending) onCancel(); }}
      title="Xác nhận đổi lịch học"
      description="Kiểm tra thời gian mới và nhập lý do sẽ gửi tới phụ huynh."
      size="sm"
    >
      {request && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!normalizedReason || isPending) return;
            onConfirm(normalizedReason);
          }}
          className="grid gap-4"
        >
          <div className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
            <p className="text-sm font-bold text-neutral-900">{request.className}</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <ScheduleTime label="Lịch hiện tại" startAt={request.previousStartAt} endAt={request.previousEndAt} />
              <ScheduleTime label="Lịch mới" startAt={request.startAt} endAt={request.endAt} emphasized />
            </dl>
          </div>

          <div>
            <label htmlFor="reschedule-reason" className="mb-1.5 block text-sm font-bold text-neutral-800">
              Lý do đổi lịch <span className="text-danger-600">*</span>
            </label>
            <textarea
              id="reschedule-reason"
              required
              maxLength={500}
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ví dụ: Giáo viên có lịch công tác đột xuất, lớp chuyển sang 18:30 ngày 28/08."
              className="w-full resize-y rounded-input border border-neutral-300 bg-neutral-0 px-3 py-2.5 text-sm leading-6 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-neutral-500">
              <span>Nội dung này được dùng cho thông báo nội bộ và Utility.</span>
              <span className="tabular-nums">{reason.length}/500</span>
            </div>
          </div>

          <div className="rounded-input border border-primary-100 bg-primary-50 p-3 text-sm text-primary-900">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-700">Nội dung gửi phụ huynh</p>
            <p className="mt-1.5 leading-6">{normalizedReason || "Nhập lý do để xem trước nội dung thông báo."}</p>
          </div>

          {isError && <p role="alert" className="text-sm font-semibold text-danger-700">Không thể đổi lịch. Lý do đã nhập vẫn được giữ để bạn thử lại.</p>}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button type="button" disabled={isPending} onClick={onCancel}>Quay lại</Button>
            <Button type="submit" variant="primary" disabled={!normalizedReason || isPending}>{isPending ? "Đang cập nhật..." : "Xác nhận đổi lịch"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ScheduleTime({ label, startAt, endAt, emphasized = false }: { label: string; startAt: Date; endAt: Date; emphasized?: boolean }) {
  return (
    <div>
      <dt className={`text-xs font-bold ${emphasized ? "text-primary-700" : "text-neutral-500"}`}>{label}</dt>
      <dd className="mt-1 font-semibold leading-6 text-neutral-800">
        {format(startAt, DATE_TIME_FORMAT, { locale: vi })}<br />
        đến {format(endAt, "HH:mm")}
      </dd>
    </div>
  );
}
